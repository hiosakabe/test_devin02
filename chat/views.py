from django.shortcuts import render
from django.core.files.storage import FileSystemStorage
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from .models import ChatRoom, WhiteboardRoom
from .forms import VideoUploadForm

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
    
    if request.method == 'POST':
        form = VideoUploadForm(request.POST, request.FILES)
        if form.is_valid():
            if form.cleaned_data.get('video'):
                video = form.cleaned_data['video']
                fs = FileSystemStorage()
                filename = fs.save(f'videos/{room_name}/{video.name}', video)
                chat_room.background_type = 'upload'
                chat_room.background_url = fs.url(filename)
                chat_room.save()
            elif form.cleaned_data.get('youtube_url'):
                chat_room.background_type = 'youtube'
                chat_room.background_url = form.cleaned_data['youtube_url']
                chat_room.save()
    else:
        form = VideoUploadForm()
    
    return render(request, 'chat/room.html', {
        'room_name': room_name,
        'room': chat_room,
        'form': form
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

@require_POST
def remove_background(request, room_name):
    try:
        chat_room = ChatRoom.objects.get(name=room_name)
        chat_room.background_type = 'none'
        chat_room.background_url = None
        chat_room.save()
        return JsonResponse({'success': True})
    except ChatRoom.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Room not found'})
