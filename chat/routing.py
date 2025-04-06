from django.urls import re_path
from . import consumers
from . import whiteboard_consumer

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_name>\w+)/$', consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/whiteboard/(?P<room_name>\w+)/$', whiteboard_consumer.WhiteboardConsumer.as_asgi()),
]

# Add support for quiz WebSocket path
websocket_urlpatterns.append(
    re_path(r'ws/quiz/(?P<room_name>[\w-]+)/$', consumers.ChatConsumer.as_asgi()),
)
