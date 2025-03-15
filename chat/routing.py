from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_name>\w+)/$', consumers.ChatConsumer.as_asgi()),
]

# Add support for quiz WebSocket path
websocket_urlpatterns.append(
    re_path(r'ws/quiz/(?P<room_name>[\w-]+)/$', consumers.ChatConsumer.as_asgi()),
)
