from django.shortcuts import render
from .models import ChatRoom, WhiteboardRoom

def index(request):
    chat_rooms = ChatRoom.objects.all().order_by('-created_at')
    whiteboard_rooms = WhiteboardRoom.objects.all().order_by('-created_at')
    return render(request, 'chat/index.html', {
        'chat_rooms': chat_rooms,
        'whiteboard_rooms': whiteboard_rooms
    })

def room(request, room_name):
    # Get or create the chat room
    chat_room, created = ChatRoom.objects.get_or_create(name=room_name)
    
    return render(request, 'chat/room.html', {
        'room_name': room_name,
        'room': chat_room
    })

def quiz_room(request, quiz_id):
    return render(request, 'chat/quiz_room.html', {
        'quiz_id': quiz_id
    })

def whiteboard(request, room_name):
    whiteboard_room, created = WhiteboardRoom.objects.get_or_create(name=room_name)
    
    return render(request, 'chat/whiteboard.html', {
        'room_name': room_name,
        'room': whiteboard_room
    })

def create_whiteboard(request):
    return render(request, 'chat/create_whiteboard.html')
