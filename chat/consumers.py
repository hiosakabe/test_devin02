import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatRoom, ChatMessage
import random

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Create the room if it doesn't exist
        await self.create_room_if_needed(self.room_name)

        await self.accept()

        # Send previous messages to the newly connected client
        messages = await self.get_messages(self.room_name)
        for message in messages:
            await self.send(text_data=json.dumps(message))

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        username = text_data_json.get('username', 'Anonymous')
        message = text_data_json.get('message', '')
        color = text_data_json.get('color', '#000000')
        speed = text_data_json.get('speed', random.randint(3, 8))
        position = text_data_json.get('position', random.randint(10, 90))

        # Save message to database
        await self.save_message(
            room_name=self.room_name,
            username=username,
            message=message,
            color=color,
            speed=speed,
            position=position
        )

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'username': username,
                'message': message,
                'color': color,
                'speed': speed,
                'position': position,
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'username': event['username'],
            'message': event['message'],
            'color': event['color'],
            'speed': event['speed'],
            'position': event['position'],
        }))

    @database_sync_to_async
    def create_room_if_needed(self, room_name):
        ChatRoom.objects.get_or_create(name=room_name)

    @database_sync_to_async
    def save_message(self, room_name, username, message, color, speed, position):
        room = ChatRoom.objects.get(name=room_name)
        ChatMessage.objects.create(
            room=room,
            username=username,
            message=message,
            color=color,
            speed=speed,
            position=position
        )

    @database_sync_to_async
    def get_messages(self, room_name):
        room = ChatRoom.objects.get(name=room_name)
        messages = ChatMessage.objects.filter(room=room).order_by('timestamp')[:50]
        return [
            {
                'username': message.username,
                'message': message.message,
                'color': message.color,
                'speed': message.speed,
                'position': message.position,
            }
            for message in messages
        ]
