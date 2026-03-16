/* ========================================================
   editor_inputs.js
   Vincula todos los inputs con data-key para actualización en vivo.
   También maneja checkboxes y selects.
   ======================================================== */

import { config } from '../editor_principal.js';
import { postMessage, normalizarColor } from '../editor_utilidades.js';

export function initInputs() {
    // Inputs de texto (no color)
    document.querySelectorAll(".ep-input[data-key]:not(input[type='color'])").forEach(input => {
        input.addEventListener("input", () => {
            const key = input.dataset.key;
            let val = input.value;
            if (key.startsWith("color_")) {
                val = normalizarColor(val);
                input.value = val;
            }
            config[key] = val;
            postMessage("UPDATE_FIELD", { key, value: val });
            if (key.startsWith("color_")) {
                // Sincronizar otros inputs con la misma key
                document.querySelectorAll(`[data-key="${key}"]`).forEach(el => {
                    if (el !== input && el.type !== 'color') el.value = val;
                });
                document.querySelectorAll(`input[type="color"][data-key="${key}"]`).forEach(el => {
                    el.value = val;
                });
            }
        });
    });

    // Inputs color
    document.querySelectorAll('input[type="color"][data-key]').forEach(input => {
        ['input', 'change'].forEach(eventType => {
            input.addEventListener(eventType, () => {
                const key = input.dataset.key;
                let val = normalizarColor(input.value);
                config[key] = val;
                postMessage("UPDATE_FIELD", { key, value: val });
                document.querySelectorAll(`.ep-input[data-key="${key}"]:not(input[type='color'])`).forEach(el => {
                    el.value = val;
                });
            });
        });
    });

    // Checkboxes con data-key
    document.querySelectorAll('input[type="checkbox"][data-key]').forEach(chk => {
        chk.addEventListener("change", () => {
            config[chk.dataset.key] = chk.checked;
            postMessage("UPDATE_FIELD", { key: chk.dataset.key, value: chk.checked });
        });
    });

    // Selects con data-key
    document.querySelectorAll('.ep-select[data-key]').forEach(sel => {
        sel.addEventListener("change", () => {
            config[sel.dataset.key] = sel.value;
            postMessage("UPDATE_FIELD", { key: sel.dataset.key, value: sel.value });
            // Si es fuente, actualizar preview de fuentes (si el módulo de estilo está cargado)
            if (sel.dataset.key.startsWith('font_')) {
                import('./editor_estilo.js').then(m => m.updateFontPreview?.());
            }
        });
    });
}