from django.urls import path
from core import views

urlpatterns = [
    path("",                        views.home,                  name="home"),
    path("chat/enviar/",            views.enviar_mensaje,        name="chat_enviar"),
    path("chat/obtener/",           views.obtener_mensajes,      name="chat_obtener"),
    path("editor/login/",           views.editor_login,          name="editor_login"),
    path("editor/logout/",          views.editor_logout,         name="editor_logout"),
    path("editor/",                 views.editor_page,           name="editor_page"),
    path("editor/guardar/",         views.editor_guardar,        name="editor_guardar"),
    path("editor/upload-imagen/",   views.editor_upload_imagen,  name="editor_upload_imagen"),
    path("editor/quitar-imagen/",   views.editor_quitar_imagen,  name="editor_quitar_imagen"),
    path("editor/resetear/",        views.editor_resetear,       name="editor_resetear"),
]