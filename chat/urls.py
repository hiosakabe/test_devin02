from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('chat/<str:room_name>/', views.room, name='room'),
    path('quiz/<str:quiz_id>/', views.quiz_room, name='quiz_room'),
]
