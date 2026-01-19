from django.urls import path
from .views import home
from core import views

urlpatterns = [
    path("", home, name="home"),
    path("chat/enviar/", views.enviar_mensaje, name="chat_enviar"),
    path("chat/obtener/", views.obtener_mensajes, name="chat_obtener"),
]
