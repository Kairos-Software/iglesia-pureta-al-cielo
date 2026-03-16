/* ========================================================
   editor_utilidades.js
   Utilidades comunes para el editor: toast, cookies, postMessage,
   manipulación de colores, fuentes, subida de imágenes, etc.
   ======================================================== */

let iframeRef = null;
let overlayTimeout = null;

export function toast(mensaje) {
    const el = document.getElementById("epToast");
    const text = document.getElementById("epToastText");
    if (!el || !text) return;
    text.textContent = mensaje;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 3000);
}

export function getCookie(nombre) {
    let valor = null;
    document.cookie.split(";").forEach(c => {
        c = c.trim();
        if (c.startsWith(nombre + "=")) valor = decodeURIComponent(c.slice(nombre.length + 1));
    });
    return valor;
}

export function esc(texto) {
    return String(texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function normalizarColor(color) {
    if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
        return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color;
}

export function hexToRgba(hex, alpha) {
    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    } catch {
        return `rgba(0,0,0,${alpha})`;
    }
}

export function ajustarBrillo(hex, cantidad) {
    try {
        const clamp = n => Math.min(255, Math.max(0, n));
        const r = clamp(parseInt(hex.slice(1, 3), 16) + cantidad);
        const g = clamp(parseInt(hex.slice(3, 5), 16) + cantidad);
        const b = clamp(parseInt(hex.slice(5, 7), 16) + cantidad);
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    } catch {
        return hex;
    }
}

export function cargarGoogleFont(nombreFuente) {
    const id = `gfont-ep-${nombreFuente.replace(/\s/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(nombreFuente)}:wght@400;600;700&display=swap`;
    document.head.appendChild(link);
}

export function setIframe(iframe) {
    iframeRef = iframe;
}

export function postMessage(tipo, payload) {
    if (iframeRef?.contentWindow) {
        iframeRef.contentWindow.postMessage({ type: tipo, payload }, "*");
    }
}

export async function subirImagen(file, claveConfig, previewEl) {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) {
        toast("⚠️ Imagen demasiado grande (máx. 5MB)");
        return null;
    }
    const fd = new FormData();
    fd.append("image", file);
    fd.append("key", claveConfig);
    fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
    try {
        const res = await fetch("/editor/upload-imagen/", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok && data.url) {
            return data.url;
        } else {
            toast("⚠️ " + (data.error || "Error desconocido"));
            return null;
        }
    } catch (e) {
        toast("⚠️ Error de conexión");
        return null;
    }
}

export async function quitarImagen(claveConfig, previewEl) {
    const fd = new FormData();
    fd.append("key", claveConfig);
    fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
    try {
        const res = await fetch("/editor/quitar-imagen/", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) {
            return true;
        }
    } catch (e) {
        toast("⚠️ Error al eliminar imagen");
    }
    return false;
}

export function actualizarPreviewImagen(wrap, url, claveConfig, onRemove = null) {
    if (url) {
        const timestamp = Date.now();
        wrap.innerHTML = `
            <img src="${url}?t=${timestamp}" alt="preview" style="width:100%;height:100%;object-fit:cover">
            <button class="ep-img-remove" data-key="${claveConfig}" title="Quitar imagen">
                <span class="material-symbols-outlined">close</span>
            </button>`;
        wrap.querySelector(".ep-img-remove").addEventListener("click", async (e) => {
            e.stopPropagation();
            const ok = await quitarImagen(claveConfig, wrap);
            if (ok) {
                actualizarPreviewImagen(wrap, "", claveConfig, onRemove);
                postMessage("UPDATE_FIELD", { key: claveConfig, value: "" });
                if (onRemove) onRemove();
            }
        });
    } else {
        wrap.innerHTML = `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin imagen</span></div>`;
    }
}

export function bindUpload(inputId, claveConfig, previewId, callbackAdicional = null, onRemove = null, valorInicial = null) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input) return;

    if (valorInicial && preview) {
        actualizarPreviewImagen(preview, valorInicial, claveConfig, onRemove);
    } else {
        import('./editor_principal.js').then(({ config }) => {
            if (config[claveConfig] && preview) {
                actualizarPreviewImagen(preview, config[claveConfig], claveConfig, onRemove);
            }
        }).catch(err => console.warn("Error al importar editor_principal:", err));
    }

    input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = await subirImagen(file, claveConfig, preview);
        if (url) {
            actualizarPreviewImagen(preview, url, claveConfig, onRemove);
            postMessage("UPDATE_FIELD", { key: claveConfig, value: url });
            if (callbackAdicional) callbackAdicional(url);
        }
        input.value = '';
    });
}

export async function guardarConfig(configData) {
    const fd = new FormData();
    fd.append("config", JSON.stringify(configData));
    fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
    try {
        const res = await fetch("/editor/guardar/", { method: "POST", body: fd });
        const data = await res.json();
        return data.ok;
    } catch (e) {
        console.error("Error guardando configuración:", e);
        return false;
    }
}

// Funciones para overlay de carga
export function mostrarOverlayCarga() {
    const container = document.getElementById("epIframeContainer");
    if (!container) return;
    let overlay = container.querySelector(".ep-iframe-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "ep-iframe-overlay";
        overlay.innerHTML = '<div class="spinner"></div>';
        container.appendChild(overlay);
    }
    if (overlayTimeout) clearTimeout(overlayTimeout);
    overlayTimeout = setTimeout(() => {
        overlay.classList.add("show");
    }, 50);
}

export function ocultarOverlayCarga() {
    const container = document.getElementById("epIframeContainer");
    if (!container) return;
    const overlay = container.querySelector(".ep-iframe-overlay");
    if (overlay) {
        if (overlayTimeout) clearTimeout(overlayTimeout);
        overlay.classList.remove("show");
    }
}

export function ocultarIframe() {
    const container = document.getElementById("epIframeContainer");
    if (container) {
        container.classList.add("iframe-hidden");
    }
}

export function mostrarIframe() {
    const container = document.getElementById("epIframeContainer");
    if (container) {
        container.classList.remove("iframe-hidden");
    }
}

export function mostrarIframeConRetraso(ms = 400) {
    setTimeout(() => {
        mostrarIframe();
    }, ms);
}