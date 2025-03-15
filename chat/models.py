from django.db import models
from django.utils import timezone

class ChatRoom(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, related_name='messages', on_delete=models.CASCADE)
    username = models.CharField(max_length=100)
    message = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)
    color = models.CharField(max_length=20, default='#000000')
    speed = models.IntegerField(default=5)  # 1-10 scale for animation speed
    position = models.IntegerField(default=50)  # Vertical position (%)

    def __str__(self):
        return f'{self.username}: {self.message[:50]}'

    class Meta:
        ordering = ['timestamp']
