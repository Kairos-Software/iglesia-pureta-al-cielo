/* ========================================================
   editor_estilo.js
   Módulo para la pestaña "Estilo".
   Paletas de colores predefinidas, colores personalizados,
   selectores de fuente y vista previa tipográfica.
   ======================================================== */

import { config } from '../editor_principal.js';
import { postMessage, cargarGoogleFont } from '../editor_utilidades.js';
import { pushHistory } from './editor_avanzado.js';

let fontPreviewTitle, fontPreviewBody;
const colorPresets = {
    default: { color_bg_primary: "#0d1b2a", color_accent: "#c9a84c", color_text: "#f0f4f8" },
    emerald: { color_bg_primary: "#0a1628", color_accent: "#10b981", color_text: "#ecfdf5" },
    sunset:  { color_bg_primary: "#1a0a0a", color_accent: "#ef4444", color_text: "#fff7f7" },
    ocean:   { color_bg_primary: "#0c1a2e", color_accent: "#3b82f6", color_text: "#eff6ff" },
    purple:  { color_bg_primary: "#13001f", color_accent: "#a855f7", color_text: "#faf5ff" },
    rose:    { color_bg_primary: "#1a0010", color_accent: "#f43f5e", color_text: "#fff1f2" },
};

export function initEstilo() {
    fontPreviewTitle = document.querySelector(".ep-font-preview-title");
    fontPreviewBody  = document.querySelector(".ep-font-preview-body");

    // Paletas de color
    document.querySelectorAll(".ep-color-preset").forEach(btn => {
        btn.addEventListener("click", () => {
            const preset = colorPresets[btn.dataset.preset];
            if (!preset) return;
            document.querySelectorAll(".ep-color-preset").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            Object.entries(preset).forEach(([key, value]) => {
                config[key] = value;
                document.querySelectorAll(`[data-key="${key}"]`).forEach(el => {
                    if (el.type === 'checkbox') {
                        el.checked = value;
                    } else {
                        el.value = value;
                    }
                });
                postMessage("UPDATE_FIELD", { key, value });
            });
            pushHistory("Paleta de colores aplicada");
        });
    });

    // Selectores de fuente
    document.querySelectorAll(".ep-select[data-key]").forEach(sel => {
        sel.addEventListener("change", () => {
            config[sel.dataset.key] = sel.value;
            postMessage("UPDATE_FIELD", { key: sel.dataset.key, value: sel.value });
            updateFontPreview();
            // pushHistory se llamará automáticamente por el evento change global
        });
    });

    updateFontPreview();

    // Al restaurar estado, actualizar la vista previa de fuentes
    window.addEventListener('editor:estadoRestaurado', updateFontPreview);
}

export function updateFontPreview() {
    const displayFont = config.font_display || "Cormorant Garamond";
    const bodyFont    = config.font_body    || "DM Sans";
    if (fontPreviewTitle) fontPreviewTitle.style.fontFamily = `'${displayFont}', serif`;
    if (fontPreviewBody)  fontPreviewBody.style.fontFamily  = `'${bodyFont}', sans-serif`;
    cargarGoogleFont(displayFont);
    cargarGoogleFont(bodyFont);
}