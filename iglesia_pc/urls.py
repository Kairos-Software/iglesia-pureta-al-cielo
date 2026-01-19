from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Aquí incluimos las rutas de la app core
    path('', include('core.urls')),
]
