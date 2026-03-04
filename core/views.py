import os
import json
import time
from django.shortcuts import render, redirect
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from core.models import CanalTransmision


CONFIG_PATH = os.path.join(settings.BASE_DIR, "site_data", "site_config.json")
UPLOAD_DIR  = os.path.join(settings.BASE_DIR, "core", "static", "core", "img", "uploads")

# Defaults base del sistema
CONFIG_DEFAULT = {
    "template":         "kaircam",
    "org_name":         "Mi Organización",
    "org_slogan":       "Transformando el futuro juntos",
    "logo_url":         "",
    "hero_eyebrow":     "Bienvenidos",
    "hero_title":       "Tu Organización",
    "hero_subtitle":    "Conectamos personas, ideas y propósitos para crear un impacto positivo en la comunidad.",
    "hero_btn_text":    "Conocer Más",
    "hero_bg_url":      "",
    "live_title":       "Transmisión en Vivo",
    "live_subtitle":    "Únete a nuestra comunidad en tiempo real desde cualquier lugar",
    "about_eyebrow":    "SOBRE NOSOTROS",
    "about_title":      "Quiénes Somos",
    "about_text":       "Somos una organización comprometida con la excelencia y la innovación.",
    "about_img_url":    "",
    "stat1_number":     "10+",
    "stat1_label":      "Años de experiencia",
    "stat2_number":     "500+",
    "stat2_label":      "Miembros activos",
    "stat3_number":     "20+",
    "stat3_label":      "Países alcanzados",
    "contact_title":    "Contacto",
    "contact_subtitle": "Estamos aquí para ayudarte",
    "contact_address":  "Av. Principal 123, Ciudad, País",
    "contact_email":    "contacto@tuorganizacion.com",
    "contact_phone":    "+1 (555) 123-4567",
    "social_instagram": "",
    "social_youtube":   "",
    "social_facebook":  "",
    "social_tiktok":    "",
    "color_accent":     "",
    "color_bg_primary": "",
    "color_text":       "",
    "font_display":     "",
    "font_body":        "",
    "dynamic_sections": [],
}

# Defaults de estilo por plantilla — se aplican al resetear
PLANTILLA_DEFAULTS = {
    "kaircam": {
        "color_bg_primary": "#0d0e12",
        "color_accent":     "#ff3e3e",
        "color_text":       "#f1f5f9",
        "font_display":     "Barlow Condensed",
        "font_body":        "Barlow",
    },
    "moderno": {
        "color_bg_primary": "#0d1b2a",
        "color_accent":     "#c9a84c",
        "color_text":       "#f0f4f8",
        "font_display":     "Cormorant Garamond",
        "font_body":        "DM Sans",
    },
    "lateral": {
        "color_bg_primary": "#1a1a2e",
        "color_accent":     "#e94560",
        "color_text":       "#f5f5f5",
        "font_display":     "Playfair Display",
        "font_body":        "DM Sans",
    },
    "magazine": {
        "color_bg_primary": "#faf7f2",
        "color_accent":     "#4f46e5",
        "color_text":       "#1e1b4b",
        "font_display":     "Playfair Display",
        "font_body":        "Lato",
    },
}

PLANTILLAS_META = {
    "kaircam": {
        "nombre":      "Kaircam (Base)",
        "descripcion": "Diseño de marca, broadcast profesional.",
        "colores":     ["#0d0e12", "#ff3e3e", "#f1f5f9"],
    },
    "moderno": {
        "nombre":      "Moderno",
        "descripcion": "Oscuro con acentos dorados.",
        "colores":     ["#0d1b2a", "#c9a84c", "#f0f4f8"],
    },
    "lateral": {
        "nombre":      "Lateral",
        "descripcion": "Nav fija a la izquierda.",
        "colores":     ["#1a1a2e", "#e94560", "#f5f5f5"],
    },
    "magazine": {
        "nombre":      "Magazine",
        "descripcion": "Editorial, hero dividido, fondo crema.",
        "colores":     ["#faf7f2", "#4f46e5", "#1e1b4b"],
    },
}


def cargar_config():
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {**CONFIG_DEFAULT, **data}
    except (json.JSONDecodeError, OSError):
        pass
    return dict(CONFIG_DEFAULT)


def guardar_config_archivo(config: dict):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def es_editor_logueado(request):
    return request.session.get("editor_logged_in", False)


def get_stream_context():
    usuario = settings.IGLESIA_USER
    stream  = CanalTransmision.objects.filter(usuario__username=usuario).first()
    hls_url = f"{settings.HLS_BASE_URL}/{settings.HLS_PROGRAM_PATH}/{usuario}.m3u8"
    return {
        "stream":  stream,
        "on_air":  stream.en_vivo if stream else False,
        "hls_url": hls_url,
    }


def listar_plantillas():
    layouts_dir = os.path.join(settings.BASE_DIR, "core", "templates", "core", "layouts")
    plantillas = []
    if os.path.isdir(layouts_dir):
        for fname in sorted(os.listdir(layouts_dir)):
            if fname.endswith(".html"):
                pid  = fname.replace(".html", "")
                meta = PLANTILLAS_META.get(pid, {
                    "nombre":      pid.capitalize(),
                    "descripcion": f"Plantilla {pid.capitalize()}",
                    "colores":     ["#333", "#666", "#ccc"],
                })
                plantillas.append({"id": pid, **meta})
    else:
        for pid, meta in PLANTILLAS_META.items():
            plantillas.append({"id": pid, **meta})
    return plantillas


# ══════════════════════════════════════════════════════
# VISTAS PRINCIPALES
# ══════════════════════════════════════════════════════

def home(request):
    site_config = cargar_config()
    response = render(request, "core/home.html", {
        "site_config":      site_config,
        "site_config_json": json.dumps(site_config, ensure_ascii=False),
        "editor_logged_in": es_editor_logueado(request),
        "plantillas":       listar_plantillas(),
        **get_stream_context(),
    })
    response["X-Frame-Options"] = "SAMEORIGIN"
    return response


# ══════════════════════════════════════════════════════
# CHAT
# ══════════════════════════════════════════════════════

mensajes_chat = []


@csrf_exempt
def enviar_mensaje(request):
    global mensajes_chat
    stream = CanalTransmision.objects.filter(usuario__username=settings.IGLESIA_USER).first()
    if not stream or not stream.en_vivo:
        mensajes_chat = []
        return JsonResponse({"activo": False, "mensajes": []})
    if request.method == "POST":
        nombre  = request.POST.get("usuario", "Anónimo")
        mensaje = request.POST.get("mensaje", "")
        if mensaje.strip():
            mensajes_chat.append(f"{nombre}: {mensaje}")
    return JsonResponse({"activo": True, "mensajes": mensajes_chat})


def obtener_mensajes(request):
    global mensajes_chat
    stream = CanalTransmision.objects.filter(usuario__username=settings.IGLESIA_USER).first()
    if not stream or not stream.en_vivo:
        mensajes_chat = []
        return JsonResponse({"activo": False, "mensajes": []})
    return JsonResponse({"activo": True, "mensajes": mensajes_chat})


# ══════════════════════════════════════════════════════
# EDITOR AUTH
# ══════════════════════════════════════════════════════

def editor_login(request):
    site_config = cargar_config()
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        if username != settings.IGLESIA_USER:
            return render(request, "core/login.html", {
                "error": "Usuario no autorizado para este sitio.",
                "site_name": site_config.get("org_name"),
            })
        user = authenticate(request, username=username, password=password)
        if user is not None:
            request.session["editor_logged_in"] = True
            request.session["editor_username"]  = username
            request.session.set_expiry(60 * 60 * 8)
            return redirect("home")
        return render(request, "core/login.html", {
            "error": "Contraseña incorrecta.",
            "site_name": site_config.get("org_name"),
        })
    if es_editor_logueado(request):
        return redirect("home")
    return render(request, "core/login.html", {"site_name": site_config.get("org_name")})


def editor_logout(request):
    request.session.pop("editor_logged_in", None)
    request.session.pop("editor_username", None)
    return redirect("home")


def editor_page(request):
    if not es_editor_logueado(request):
        return redirect("editor_login")
    site_config = cargar_config()
    return render(request, "core/editor_page.html", {
        "site_config":      site_config,
        "site_config_json": json.dumps(site_config, ensure_ascii=False),
        "plantillas":       listar_plantillas(),
    })


# ══════════════════════════════════════════════════════
# EDITOR — GUARDAR
# ══════════════════════════════════════════════════════

@csrf_exempt
def editor_guardar(request):
    if not es_editor_logueado(request):
        return JsonResponse({"ok": False, "error": "No autorizado"}, status=403)
    if request.method != "POST":
        return JsonResponse({"ok": False, "error": "Método no permitido"}, status=405)
    try:
        new_config = json.loads(request.POST.get("config", "{}"))
        if not isinstance(new_config.get("dynamic_sections"), list):
            new_config["dynamic_sections"] = []
        guardar_config_archivo(new_config)
        return JsonResponse({"ok": True})
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "JSON inválido"}, status=400)
    except OSError as e:
        return JsonResponse({"ok": False, "error": str(e)}, status=500)


# ══════════════════════════════════════════════════════
# EDITOR — UPLOAD IMAGEN
# Nombre de archivo FIJO por clave → siempre reemplaza la anterior.
# No depende del nombre original del archivo subido.
# ══════════════════════════════════════════════════════

@csrf_exempt
def editor_upload_imagen(request):
    if not es_editor_logueado(request):
        return JsonResponse({"ok": False, "error": "No autorizado"}, status=403)
    if request.method != "POST":
        return JsonResponse({"ok": False, "error": "Método no permitido"}, status=405)

    image_file = request.FILES.get("image")
    config_key = request.POST.get("key", "imagen")

    if not image_file:
        return JsonResponse({"ok": False, "error": "No se recibió imagen"})
    if image_file.size > 10 * 1024 * 1024:
        return JsonResponse({"ok": False, "error": "Imagen demasiado grande (máx. 10MB)"})

    # Detectar extensión del archivo original
    _, ext = os.path.splitext(image_file.name)
    ext = ext.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".svg", ".webp", ".gif"]:
        ext = ".jpg"

    # Nombre fijo basado en la clave del config — ignora el nombre original
    safe_key  = "".join(c if c.isalnum() or c in "-_" else "_" for c in config_key)
    filename  = f"{safe_key}{ext}"
    save_path = os.path.join(UPLOAD_DIR, filename)

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Eliminar versiones anteriores con distinta extensión
    for old_ext in [".jpg", ".jpeg", ".png", ".svg", ".webp", ".gif"]:
        old_path = os.path.join(UPLOAD_DIR, f"{safe_key}{old_ext}")
        if os.path.exists(old_path) and old_path != save_path:
            try:
                os.remove(old_path)
            except OSError:
                pass

    # Guardar
    with open(save_path, "wb") as f:
        for chunk in image_file.chunks():
            f.write(chunk)

    # Cache-busting con timestamp
    url = f"/static/core/img/uploads/{filename}?v={int(time.time())}"
    return JsonResponse({"ok": True, "url": url})


# ══════════════════════════════════════════════════════
# EDITOR — QUITAR IMAGEN
# ══════════════════════════════════════════════════════

@csrf_exempt
def editor_quitar_imagen(request):
    if not es_editor_logueado(request):
        return JsonResponse({"ok": False, "error": "No autorizado"}, status=403)
    if request.method != "POST":
        return JsonResponse({"ok": False, "error": "Método no permitido"}, status=405)

    config_key = request.POST.get("key", "")
    if not config_key:
        return JsonResponse({"ok": False, "error": "Falta key"})

    config = cargar_config()
    config[config_key] = ""
    guardar_config_archivo(config)

    # Borrar archivo físico
    safe_key = "".join(c if c.isalnum() or c in "-_" else "_" for c in config_key)
    for ext in [".jpg", ".jpeg", ".png", ".svg", ".webp", ".gif"]:
        fpath = os.path.join(UPLOAD_DIR, f"{safe_key}{ext}")
        try:
            if os.path.exists(fpath):
                os.remove(fpath)
        except OSError:
            pass

    return JsonResponse({"ok": True})


# ══════════════════════════════════════════════════════
# EDITOR — RESETEAR
# Restaura los defaults del sistema + los de la plantilla activa.
# NO borra la plantilla seleccionada, solo los estilos y contenido.
# ══════════════════════════════════════════════════════

@csrf_exempt
def editor_resetear(request):
    if not es_editor_logueado(request):
        return JsonResponse({"ok": False, "error": "No autorizado"}, status=403)
    if request.method != "POST":
        return JsonResponse({"ok": False, "error": "Método no permitido"}, status=405)

    try:
        config_actual   = cargar_config()
        template_activo = config_actual.get("template", "kaircam")

        # Base defaults + defaults de estilo de la plantilla activa
        config_reseteada = dict(CONFIG_DEFAULT)
        config_reseteada["template"] = template_activo
        config_reseteada.update(
            PLANTILLA_DEFAULTS.get(template_activo, PLANTILLA_DEFAULTS["kaircam"])
        )

        guardar_config_archivo(config_reseteada)

        # Limpiar imágenes subidas
        if os.path.isdir(UPLOAD_DIR):
            for fname in os.listdir(UPLOAD_DIR):
                try:
                    os.remove(os.path.join(UPLOAD_DIR, fname))
                except OSError:
                    pass

        return JsonResponse({"ok": True})
    except OSError as e:
        return JsonResponse({"ok": False, "error": str(e)}, status=500)