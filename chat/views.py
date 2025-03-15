from django.shortcuts import render
from .models import ChatRoom

def index(request):
    rooms = ChatRoom.objects.all().order_by('-created_at')
    return render(request, 'chat/index.html', {
        'rooms': rooms
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
