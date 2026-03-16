/* ========================================================
   editor_seo.js
   Módulo para la pestaña "SEO".
   Título, descripción, keywords, Open Graph y preview en vivo.
   ======================================================== */

import { config } from '../editor_principal.js';

export function initSeo() {
    const seoTitleInput = document.querySelector('[data-key="seo_title"]');
    const seoDescInput  = document.querySelector('[data-key="seo_description"]');

    seoTitleInput?.addEventListener("input", updateSeoPreview);
    seoDescInput?.addEventListener("input", updateSeoPreview);
    updateSeoPreview();

    window.addEventListener('editor:estadoRestaurado', updateSeoPreview);
}

export function updateSeoPreview() {
    const titleEl = document.getElementById("epSeoPreviewTitle");
    const descEl  = document.getElementById("epSeoPreviewDesc");
    if (titleEl) titleEl.textContent = config.seo_title || config.org_name || "Título de página";
    if (descEl)  descEl.textContent  = config.seo_description || "Descripción meta de tu sitio...";
}