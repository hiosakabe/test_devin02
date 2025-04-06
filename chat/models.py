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

class WhiteboardRoom(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Whiteboard: {self.name}'

class WhiteboardElement(models.Model):
    ELEMENT_TYPES = (
        ('path', 'Path'),
        ('line', 'Line'),
        ('rect', 'Rectangle'),
        ('circle', 'Circle'),
        ('text', 'Text'),
    )
    
    room = models.ForeignKey(WhiteboardRoom, related_name='elements', on_delete=models.CASCADE)
    element_id = models.CharField(max_length=100)  # Unique ID for the element
    element_type = models.CharField(max_length=20, choices=ELEMENT_TYPES)
    data = models.JSONField()  # Store coordinates, size, color, etc.
    username = models.CharField(max_length=100)
    timestamp = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f'{self.username}: {self.element_type} in {self.room.name}'
    
    class Meta:
        ordering = ['timestamp']
