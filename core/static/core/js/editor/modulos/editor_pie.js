/* ========================================================
   editor_pie.js
   Módulo para la pestaña "Footer".
   Copyright, tagline, email, links rápidos y opciones de visualización.
   ======================================================== */

import { config } from '../editor_principal.js';
import { postMessage, esc } from '../editor_utilidades.js';
import { pushHistory } from './editor_avanzado.js';

export function initPie() {
    document.getElementById("epAddFooterLinkBtn")?.addEventListener("click", agregarLink);
    renderFooterLinks();

    window.addEventListener('editor:estadoRestaurado', renderFooterLinks);
}

function renderFooterLinks() {
    const list = document.getElementById("epFooterLinksList");
    if (!list) return;
    if (config.footer_links.length === 0) {
        list.innerHTML = `<p style="font-size:12px;color:var(--ep-text-muted);margin-bottom:8px">Sin links todavía</p>`;
        return;
    }
    list.innerHTML = config.footer_links.map((lnk, i) => `
        <div class="ep-footer-link-item">
            <input type="text" class="ep-input ep-fl-label" placeholder="Texto" value="${esc(lnk.label || '')}" data-idx="${i}">
            <input type="url" class="ep-input ep-fl-url" placeholder="URL" value="${esc(lnk.url || '')}" data-idx="${i}">
            <button class="ep-footer-link-del" data-idx="${i}">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>`).join("");

    list.querySelectorAll(".ep-fl-label").forEach(inp => {
        inp.addEventListener("input", () => {
            const i = parseInt(inp.dataset.idx);
            if (config.footer_links[i]) config.footer_links[i].label = inp.value;
            postMessage("UPDATE_FIELD", { key: "footer_links", value: config.footer_links });
        });
    });
    list.querySelectorAll(".ep-fl-url").forEach(inp => {
        inp.addEventListener("input", () => {
            const i = parseInt(inp.dataset.idx);
            if (config.footer_links[i]) config.footer_links[i].url = inp.value;
            postMessage("UPDATE_FIELD", { key: "footer_links", value: config.footer_links });
        });
    });
    list.querySelectorAll(".ep-footer-link-del").forEach(btn => {
        btn.addEventListener("click", () => {
            config.footer_links.splice(parseInt(btn.dataset.idx), 1);
            renderFooterLinks();
            postMessage("UPDATE_FIELD", { key: "footer_links", value: config.footer_links });
            pushHistory("Link del footer eliminado");
        });
    });
}

function agregarLink() {
    if (config.footer_links.length >= 6) { toast("⚠️ Máximo 6 links en el footer"); return; }
    config.footer_links.push({ label: "", url: "" });
    renderFooterLinks();
    postMessage("UPDATE_FIELD", { key: "footer_links", value: config.footer_links });
    pushHistory("Link del footer agregado");
}