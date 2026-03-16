/* ========================================================
   editor_plantillas.js
   Módulo para la pestaña "Plantillas".
   Maneja la selección de plantilla, aplicación de valores
   por defecto y comunicación con el backend.
   ======================================================== */

import { config } from '../editor_principal.js';
import { postMessage, toast, getCookie, guardarConfig, mostrarOverlayCarga, ocultarOverlayCarga } from '../editor_utilidades.js';
import { pushHistory } from './editor_avanzado.js';

let templateItems;
const TEMPLATE_DEFAULTS = JSON.parse(
    document.getElementById("epTemplateDefaults")?.textContent || "{}"
);

export function initPlantillas() {
    templateItems = document.querySelectorAll(".ep-template-item");
    if (!templateItems.length) return;

    templateItems.forEach(item => {
        item.addEventListener("click", async () => {
            const tplId = item.dataset.template;

            templateItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            config.template = tplId;

            const defaults = TEMPLATE_DEFAULTS[tplId];
            if (defaults) {
                Object.entries(defaults).forEach(([key, value]) => {
                    config[key] = value;
                    document.querySelectorAll(`[data-key="${key}"]`).forEach(el => {
                        if (el.type === 'checkbox') {
                            el.checked = value;
                        } else {
                            el.value = value;
                        }
                    });
                });
                import('./editor_estilo.js').then(m => m.updateFontPreview?.());
            }

            pushHistory("Cambio de plantilla");
            await guardarConfig(config);
            recargarIframe();
        });
    });

    window.addEventListener('editor:estadoRestaurado', () => {
        const tplActual = config.template;
        templateItems.forEach(item => {
            if (item.dataset.template === tplActual) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
        // Pequeño retraso para dar tiempo al guardado
        setTimeout(recargarIframe, 100);
    });
}

function recargarIframe() {
    const iframe = document.getElementById("epPreviewIframe");
    if (iframe) {
        mostrarOverlayCarga();
        iframe.src = iframe.src.split('?')[0] + '?t=' + Date.now();
    }
}