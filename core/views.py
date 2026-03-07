import os
import re
import json
import time
from django.shortcuts import render, redirect
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from core.models import CanalTransmision


CONFIG_PATH = os.path.join(settings.BASE_DIR, "site_data", "site_config.json")
UPLOAD_DIR  = os.path.join(settings.MEDIA_ROOT, "uploads")

# ══════════════════════════════════════════════════════
# PLANTILLAS — solo nombre y descripción.
# Los colores y fuentes se leen AUTOMÁTICAMENTE del CSS
# de cada template. Si cambiás el CSS, acá no tocás nada.
# ══════════════════════════════════════════════════════
PLANTILLAS_META = {
    "kaircam": {
        "nombre":      "Kaircam (Base)",
        "descripcion": "Diseño de marca, broadcast profesional.",
    },
    "moderno": {
        "nombre":      "Moderno",
        "descripcion": "Oscuro con acentos dorados.",
    },
    "lateral": {
        "nombre":      "Lateral",
        "descripcion": "Nav fija a la izquierda.",
    },
    "magazine": {
        "nombre":      "Magazine",
        "descripcion": "Editorial, hero dividido, fondo crema.",
    },
}


def _leer_colores_css(template_id: str) -> dict:
    """
    Lee automáticamente los colores y fuentes del CSS del template.
    Extrae los fallbacks de las variables globales --bg, --accent, etc.

    El CSS de cada template tiene este patrón en :root:
        --x-bg:     var(--bg,           #070d16);
        --x-accent: var(--accent,       #c9a84c);
        --x-text:   var(--text,         #edf2f8);
        --x-fd:     var(--font-display, 'Cormorant Garamond', ...);
        --x-fb:     var(--font-body,    'DM Sans', ...);

    Si el CSS no existe o no tiene el patrón, devuelve defaults seguros.
    """
    css_path = os.path.join(
        settings.BASE_DIR,
        "core", "static", "core", "css", "templates",
        f"{template_id}.css"
    )
    if not os.path.exists(css_path):
        return {
            "color_bg_primary": "#111111",
            "color_accent":     "#ffffff",
            "color_text":       "#eeeeee",
            "font_display":     "DM Sans",
            "font_body":        "DM Sans",
        }

    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()

    root_match = re.search(r":root\s*\{([^}]+)\}", css, re.DOTALL)
    if not root_match:
        return {}

    root_block = root_match.group(1)

    def extract_fallback(global_var: str) -> str:
        escaped = global_var.replace("-", r"\-")
        pattern = rf"var\(\s*{escaped}\s*,\s*([^)]+?)\s*\)"
        match   = re.search(pattern, root_block)
        if not match:
            return ""
        value = match.group(1).strip().split(",")[0].strip().strip("'\"")
        return value

    return {
        "color_bg_primary": extract_fallback("--bg"),
        "color_accent":     extract_fallback("--accent"),
        "color_text":       extract_fallback("--text"),
        "font_display":     extract_fallback("--font-display"),
        "font_body":        extract_fallback("--font-body"),
    }


def _style_defaults(template_id: str) -> dict:
    """Colores y fuentes de un template, leídos de su CSS."""
    return _leer_colores_css(template_id)


def _template_defaults_json() -> str:
    """
    JSON que consume editor_page.js para aplicar colores
    al seleccionar una plantilla. Se genera desde los CSS — automático.
    """
    return json.dumps(
        {pid: _leer_colores_css(pid) for pid in PLANTILLAS_META},
        ensure_ascii=False
    )


def _colores_para_selector(template_id: str) -> list:
    """Los tres colores que muestra el selector visual del editor."""
    d = _leer_colores_css(template_id)
    return [
        d.get("color_bg_primary", "#333"),
        d.get("color_accent",     "#666"),
        d.get("color_text",       "#ccc"),
    ]


# ══════════════════════════════════════════════════════
# CONFIG DEFAULT DEL SISTEMA (solo contenido, no colores)
# ══════════════════════════════════════════════════════
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


def cargar_config():
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                merged = {**CONFIG_DEFAULT, **data}
    except (json.JSONDecodeError, OSError):
        merged = dict(CONFIG_DEFAULT)

    template_actual   = merged.get("template", "kaircam")
    template_anterior = merged.get("_colors_from_template", "")
    color_keys = ["color_bg_primary", "color_accent", "color_text", "font_display", "font_body"]

    # Actualizar colores si:
    # 1. Algún color esta vacio (primera vez), o
    # 2. El template cambio desde el CSS sin pasar por el editor
    if any(not merged.get(k) for k in color_keys) or template_actual != template_anterior:
        css_defaults = _leer_colores_css(template_actual)
        for k in color_keys:
            merged[k] = css_defaults.get(k, merged.get(k, ""))
        merged["_colors_from_template"] = template_actual
        # Persistir para no re-leer el CSS en cada request
        guardar_config_archivo(merged)

    return merged


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
    plantillas  = []
    if os.path.isdir(layouts_dir):
        for fname in sorted(os.listdir(layouts_dir)):
            if fname.endswith(".html"):
                pid  = fname.replace(".html", "")
                meta = PLANTILLAS_META.get(pid, {
                    "nombre":      pid.capitalize(),
                    "descripcion": f"Plantilla {pid.capitalize()}",
                })
                plantillas.append({
                    "id":      pid,
                    "colores": _colores_para_selector(pid),
                    **meta,
                })
    else:
        for pid, meta in PLANTILLAS_META.items():
            plantillas.append({
                "id":      pid,
                "colores": _colores_para_selector(pid),
                **meta,
            })
    return plantillas


# ══════════════════════════════════════════════════════
# VISTAS
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
        "site_config":            site_config,
        "site_config_json":       json.dumps(site_config, ensure_ascii=False),
        "plantillas":             listar_plantillas(),
        "template_defaults_json": _template_defaults_json(),
    })


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

    _, ext = os.path.splitext(image_file.name)
    ext = ext.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".svg", ".webp", ".gif"]:
        ext = ".jpg"

    safe_key  = "".join(c if c.isalnum() or c in "-_" else "_" for c in config_key)
    filename  = f"{safe_key}{ext}"
    save_path = os.path.join(UPLOAD_DIR, filename)

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    for old_ext in [".jpg", ".jpeg", ".png", ".svg", ".webp", ".gif"]:
        old_path = os.path.join(UPLOAD_DIR, f"{safe_key}{old_ext}")
        if os.path.exists(old_path) and old_path != save_path:
            try:
                os.remove(old_path)
            except OSError:
                pass

    with open(save_path, "wb") as f:
        for chunk in image_file.chunks():
            f.write(chunk)

    url = f"{settings.MEDIA_URL}uploads/{filename}?v={int(time.time())}"
    return JsonResponse({"ok": True, "url": url})


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

    safe_key = "".join(c if c.isalnum() or c in "-_" else "_" for c in config_key)
    for ext in [".jpg", ".jpeg", ".png", ".svg", ".webp", ".gif"]:
        fpath = os.path.join(UPLOAD_DIR, f"{safe_key}{ext}")
        try:
            if os.path.exists(fpath):
                os.remove(fpath)
        except OSError:
            pass

    return JsonResponse({"ok": True})


@csrf_exempt
def editor_resetear(request):
    if not es_editor_logueado(request):
        return JsonResponse({"ok": False, "error": "No autorizado"}, status=403)
    if request.method != "POST":
        return JsonResponse({"ok": False, "error": "Método no permitido"}, status=405)

    try:
        config_actual   = cargar_config()
        template_activo = config_actual.get("template", "kaircam")

        config_reseteada = dict(CONFIG_DEFAULT)
        config_reseteada["template"] = template_activo
        # Colores leídos del CSS — automático
        config_reseteada.update(_style_defaults(template_activo))

        guardar_config_archivo(config_reseteada)

        if os.path.isdir(UPLOAD_DIR):
            for fname in os.listdir(UPLOAD_DIR):
                try:
                    os.remove(os.path.join(UPLOAD_DIR, fname))
                except OSError:
                    pass

        return JsonResponse({"ok": True})
    except OSError as e:
        return JsonResponse({"ok": False, "error": str(e)}, status=500)