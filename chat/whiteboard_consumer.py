import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import WhiteboardRoom, WhiteboardElement
import uuid

class WhiteboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'whiteboard_{self.room_name}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.create_room_if_needed(self.room_name)

        await self.accept()

        elements = await self.get_elements(self.room_name)
        for element in elements:
            await self.send(text_data=json.dumps(element))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action', '')
        username = data.get('username', 'Anonymous')
        
        if action == 'draw':
            element_id = data.get('element_id', str(uuid.uuid4()))
            element_type = data.get('element_type', 'path')
            element_data = data.get('data', {})
            
            await self.save_element(
                room_name=self.room_name,
                element_id=element_id,
                element_type=element_type,
                data=element_data,
                username=username
            )
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'whiteboard_element',
                    'action': action,
                    'element_id': element_id,
                    'element_type': element_type,
                    'data': element_data,
                    'username': username,
                }
            )
        elif action == 'clear':
            await self.clear_elements(self.room_name)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'whiteboard_clear',
                    'username': username,
                }
            )
        elif action == 'delete':
            element_id = data.get('element_id', '')
            
            await self.delete_element(self.room_name, element_id)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'whiteboard_delete',
                    'element_id': element_id,
                    'username': username,
                }
            )

    async def whiteboard_element(self, event):
        await self.send(text_data=json.dumps({
            'action': event['action'],
            'element_id': event['element_id'],
            'element_type': event['element_type'],
            'data': event['data'],
            'username': event['username'],
        }))
    
    async def whiteboard_clear(self, event):
        await self.send(text_data=json.dumps({
            'action': 'clear',
            'username': event['username'],
        }))
    
    async def whiteboard_delete(self, event):
        await self.send(text_data=json.dumps({
            'action': 'delete',
            'element_id': event['element_id'],
            'username': event['username'],
        }))

    @database_sync_to_async
    def create_room_if_needed(self, room_name):
        WhiteboardRoom.objects.get_or_create(name=room_name)

    @database_sync_to_async
    def save_element(self, room_name, element_id, element_type, data, username):
        room = WhiteboardRoom.objects.get(name=room_name)
        WhiteboardElement.objects.create(
            room=room,
            element_id=element_id,
            element_type=element_type,
            data=data,
            username=username
        )

    @database_sync_to_async
    def get_elements(self, room_name):
        room = WhiteboardRoom.objects.get(name=room_name)
        elements = WhiteboardElement.objects.filter(room=room).order_by('timestamp')
        return [
            {
                'action': 'draw',
                'element_id': element.element_id,
                'element_type': element.element_type,
                'data': element.data,
                'username': element.username,
            }
            for element in elements
        ]
    
    @database_sync_to_async
    def clear_elements(self, room_name):
        room = WhiteboardRoom.objects.get(name=room_name)
        WhiteboardElement.objects.filter(room=room).delete()
    
    @database_sync_to_async
    def delete_element(self, room_name, element_id):
        room = WhiteboardRoom.objects.get(name=room_name)
        WhiteboardElement.objects.filter(room=room, element_id=element_id).delete()
