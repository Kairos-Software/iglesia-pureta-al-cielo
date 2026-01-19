from django.db import models
from django.contrib.auth.models import User


class CanalTransmision(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.DO_NOTHING)
    en_vivo = models.BooleanField(default=False)
    url_hls = models.CharField(max_length=255, blank=True)

    class Meta:
        managed = False
        db_table = 'core_canaltransmision'


class Cliente(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.DO_NOTHING,
        db_column='user_id'
    )
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    bio = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'core_cliente'
