from django.contrib import admin
from django.urls import path
from core import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", views.home, name="home"),
    path("editor/", views.editor_page, name="editor_page"),
    path("editor/login/", views.editor_login, name="editor_login"),
    path("editor/logout/", views.editor_logout, name="editor_logout"),
    path("editor/guardar/", views.editor_guardar, name="editor_guardar"),
    path("editor/upload-imagen/", views.editor_upload_imagen, name="editor_upload_imagen"),
    path("editor/quitar-imagen/", views.editor_quitar_imagen, name="editor_quitar_imagen"),
    path("editor/resetear/", views.editor_resetear, name="editor_resetear"),
    path("chat/enviar/", views.enviar_mensaje, name="enviar_mensaje"),
    path("chat/mensajes/", views.obtener_mensajes, name="obtener_mensajes"),
    # NUEVA RUTA PARA ESTADO DEL CANAL
    path("estado-canal/", views.estado_canal, name="estado_canal"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)