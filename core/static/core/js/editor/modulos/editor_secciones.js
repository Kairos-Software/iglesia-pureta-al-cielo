/* ========================================================
   editor_secciones.js
   Módulo para la pestaña "Secciones".
   Creación, edición y eliminación de secciones dinámicas.
   ======================================================== */

import { config } from '../editor_principal.js';
import { postMessage, toast, esc, getCookie } from '../editor_utilidades.js';
import { pushHistory } from './editor_avanzado.js';

const TYPE_LABELS = { cards: "Tarjetas", banner: "Banner", split: "Texto+Img" };
const POSITION_LABELS = {
    before_player:  "Antes del reproductor",
    after_player:   "Después del reproductor",
    before_contact: "Antes del contacto",
};
const POSITION_ICONS = {
    before_player:  "arrow_upward",
    after_player:   "arrow_downward",
    before_contact: "vertical_align_bottom",
};

let selectedSectionType = "cards";
let dynList, addSecBtn;

export function initSecciones() {
    dynList = document.getElementById("epDynamicList");
    addSecBtn = document.getElementById("epAddSectionBtn");

    document.querySelectorAll(".ep-type-btn[data-type]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".ep-type-btn[data-type]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedSectionType = btn.dataset.type;
        });
    });

    if (addSecBtn) {
        addSecBtn.addEventListener("click", agregarSeccion);
    }

    renderDynSections();

    window.addEventListener('editor:estadoRestaurado', () => {
        renderDynSections();
    });
}

function getSelectedPosition() {
    const radio = document.querySelector('input[name="secPosition"]:checked');
    return radio ? radio.value : "before_contact";
}

function agregarSeccion() {
    const type = selectedSectionType;
    const position = getSelectedPosition();

    const defaults = {
        cards: {
            title: "Nueva Sección", subtitle: "", nav_label: "Sección",
            cards: [{ icon: "star", title: "Tarjeta", text: "Descripción de la tarjeta." }]
        },
        banner: { title: "Tu Mensaje Principal", subtitle: "Un subtítulo.", btn_text: "Saber más", btn_url: "#", img_url: "" },
        split:  { title: "Título del Bloque", subtitle: "Describí tu mensaje.", btn_text: "Ver más", btn_url: "#", img_url: "", img_side: "right" }
    };

    const nueva = { id: "sec_" + Date.now(), type, position, ...defaults[type] };
    config.dynamic_sections.push(nueva);
    renderDynSections();
    postMessage("ADD_SECTION", { section: nueva });
    pushHistory("Sección agregada");
    setTimeout(() => dynList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
}

function renderDynSections() {
    if (!dynList) return;
    dynList.innerHTML = "";
    if (config.dynamic_sections.length === 0) {
        dynList.innerHTML = `<p style="font-size:12px;color:var(--ep-text-muted);text-align:center;padding:12px 0">No hay secciones agregadas</p>`;
        return;
    }
    config.dynamic_sections.forEach(sec => dynList.appendChild(crearDynItem(sec)));
}

function crearDynItem(sec) {
    const item = document.createElement("div");
    item.classList.add("ep-dyn-item");
    item.dataset.secId = sec.id;

    item.innerHTML = `
        <div class="ep-dyn-header">
            <span class="material-symbols-outlined" style="font-size:16px;color:var(--ep-text-muted)">drag_indicator</span>
            <span class="ep-dyn-name">${esc(sec.title || sec.btn_text || "Sección")}</span>
            <span class="ep-dyn-type-badge">${TYPE_LABELS[sec.type] || sec.type}</span>
            <span class="material-symbols-outlined ep-dyn-toggle">expand_more</span>
        </div>
        <div class="ep-dyn-body">
            <div class="ep-dyn-position-badge">
                <span class="material-symbols-outlined">${POSITION_ICONS[sec.position] || "place"}</span>
                ${POSITION_LABELS[sec.position] || sec.position}
            </div>
            ${buildDynBody(sec)}
            <div class="ep-dyn-actions">
                <button class="ep-dyn-del-sec" data-sec="${sec.id}">
                    <span class="material-symbols-outlined">delete</span> Eliminar sección
                </button>
            </div>
        </div>
    `;

    item.querySelector(".ep-dyn-header").addEventListener("click", () => item.classList.toggle("open"));
    bindDynFields(item, sec);
    item.querySelector(".ep-dyn-del-sec").addEventListener("click", () => {
        config.dynamic_sections = config.dynamic_sections.filter(s => s.id !== sec.id);
        item.remove();
        postMessage("REMOVE_SECTION", { secId: sec.id });
        pushHistory("Sección eliminada");
        if (config.dynamic_sections.length === 0) renderDynSections();
    });

    return item;
}

function buildDynBody(sec) {
    if (sec.type === "cards") {
        return `
            <div class="ep-field"><label>Título</label>
                <input class="ep-input ep-dyn-f" data-sec="${sec.id}" data-f="title" value="${esc(sec.title||'')}"></div>
            <div class="ep-field"><label>Subtítulo</label>
                <input class="ep-input ep-dyn-f" data-sec="${sec.id}" data-f="subtitle" value="${esc(sec.subtitle||'')}"></div>
            <div class="ep-field"><label>Nombre en menú</label>
                <input class="ep-input ep-dyn-f" data-sec="${sec.id}" data-f="nav_label" value="${esc(sec.nav_label||sec.title||'')}"></div>
            <div class="ep-subsection">Tarjetas</div>
            <div class="ep-cards-list" data-sec="${sec.id}">
                ${(sec.cards||[]).map((c,i) => cardHtml(sec.id, c, i)).join("")}
            </div>
            <button class="ep-btn-secondary ep-add-card" data-sec="${sec.id}" style="font-size:12px;padding:6px 10px;margin-top:4px">
                <span class="material-symbols-outlined">add</span> Tarjeta
            </button>`;
    }
    if (sec.type === "banner") {
        return `
            <div class="ep-field"><label>Título</label>
                <input class="ep-input ep-dyn-f" data-sec="${sec.id}" data-f="title" value="${esc(sec.title||'')}"></div>
            <div class="ep-field"><label>Subtítulo</label>
                <textarea class="ep-input ep-textarea ep-dyn-f" data-sec="${sec.id}" data-f="subtitle">${esc(sec.subtitle||'')}</textarea></div>
            <div class="ep-field-row">
                <div class="ep-field"><label>Texto botón</label>
                    <input class="ep-input ep-dyn-f" data-sec="${sec.id}" data-f="btn_text" value="${esc(sec.btn_text||'')}"></div>
                <div class="ep-field"><label>URL botón</label>
                    <input type="url" class="ep-input ep-dyn-f" data-sec="${sec.id}" data-f="btn_url" value="${esc(sec.btn_url||'#')}"></div>
            </div>
            <div class="ep-field"><label>Imagen de fondo (opcional)</label>
                <div class="ep-img-preview-wrap ep-dyn-img-preview" id="epBannerImg_${sec.id}" style="height:72px">
                    ${sec.img_url
                        ? `<img src="${esc(sec.img_url)}" style="width:100%;height:100%;object-fit:cover"><button class="ep-img-remove ep-dyn-img-remove" data-sec="${sec.id}" data-field="img_url" title="Quitar"><span class="material-symbols-outlined">close</span></button>`
                        : `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin imagen</span></div>`}
                </div>
                <input type="file" id="epBannerImgUpload_${sec.id}" accept="image/*" style="display:none">
                <button class="ep-btn-upload ep-dyn-upload-btn" data-input="epBannerImgUpload_${sec.id}">
                    <span class="material-symbols-outlined">upload</span> Subir fondo
                </button>
            </div>`;
    }
    if (sec.type === "split") {
        return `
            <div class="ep-field"><label>Título</label>
                <input class="ep-input ep-dyn-f" data-sec="${sec.id}" data-f="title" value="${esc(sec.title||'')}"></div>
            <div class="ep-field"><label>Texto</label>
                <textarea class="ep-input ep-textarea ep-dyn-f" data-sec="${sec.id}" data-f="subtitle">${esc(sec.subtitle||'')}</textarea></div>
            <div class="ep-field-row">
                <div class="ep-field"><label>Texto botón</label>
                    <input class="ep-input ep-dyn-f" data-sec="${sec.id}" data-f="btn_text" value="${esc(sec.btn_text||'')}"></div>
                <div class="ep-field"><label>URL botón</label>
                    <input type="url" class="ep-input ep-dyn-f" data-sec="${sec.id}" data-f="btn_url" value="${esc(sec.btn_url||'#')}"></div>
            </div>
            <div class="ep-field"><label>Posición de imagen</label>
                <select class="ep-input ep-select ep-dyn-f" data-sec="${sec.id}" data-f="img_side">
                    <option value="right" ${sec.img_side !== 'left' ? 'selected' : ''}>Imagen a la derecha</option>
                    <option value="left"  ${sec.img_side === 'left'  ? 'selected' : ''}>Imagen a la izquierda</option>
                </select>
            </div>
            <div class="ep-field"><label>Imagen</label>
                <div class="ep-img-preview-wrap ep-dyn-img-preview" id="epSplitImg_${sec.id}" style="height:80px">
                    ${sec.img_url
                        ? `<img src="${esc(sec.img_url)}" style="width:100%;height:100%;object-fit:cover"><button class="ep-img-remove ep-dyn-img-remove" data-sec="${sec.id}" data-field="img_url" title="Quitar"><span class="material-symbols-outlined">close</span></button>`
                        : `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin imagen</span></div>`}
                </div>
                <input type="file" id="epSplitImgUpload_${sec.id}" accept="image/*" style="display:none">
                <button class="ep-btn-upload ep-dyn-upload-btn" data-input="epSplitImgUpload_${sec.id}">
                    <span class="material-symbols-outlined">upload</span> Subir imagen
                </button>
            </div>`;
    }
    return "";
}

function bindDynFields(itemEl, sec) {
    itemEl.querySelectorAll(".ep-dyn-f").forEach(inp => {
        if (inp._b) return; inp._b = true;
        const ev = (inp.tagName === "SELECT") ? "change" : "input";
        inp.addEventListener(ev, () => {
            const s = config.dynamic_sections.find(s => s.id === inp.dataset.sec);
            if (!s) return;
            s[inp.dataset.f] = inp.value;
            if (inp.dataset.f === "title") itemEl.querySelector(".ep-dyn-name").textContent = inp.value;
            postMessage("UPDATE_SECTION", { secId: sec.id, field: inp.dataset.f, value: inp.value });
            // pushHistory se llamará automáticamente por el evento input/change global
        });
    });

    itemEl.querySelectorAll(".ep-dyn-upload-btn").forEach(btn => {
        if (btn._b) return; btn._b = true;
        btn.addEventListener("click", () => {
            document.getElementById(btn.dataset.input)?.click();
        });
    });

    itemEl.querySelectorAll('input[type="file"]').forEach(inp => {
        if (inp._b) return; inp._b = true;
        inp.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const isBanner  = inp.id.includes("Banner");
            const previewId = isBanner ? `epBannerImg_${sec.id}` : `epSplitImg_${sec.id}`;
            const wrap      = document.getElementById(previewId);
            const configKey = `sec_img_${sec.id}`;
            const fd = new FormData();
            fd.append("image", file);
            fd.append("key", configKey);
            fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
            try {
                const res  = await fetch("/editor/upload-imagen/", { method: "POST", body: fd });
                const data = await res.json();
                if (data.ok && data.url) {
                    const s = config.dynamic_sections.find(s => s.id === sec.id);
                    if (s) s.img_url = data.url;
                    postMessage("UPDATE_SECTION", { secId: sec.id, field: "img_url", value: data.url });
                    if (wrap) {
                        wrap.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:cover">
                            <button class="ep-img-remove ep-dyn-img-remove" data-sec="${sec.id}" data-field="img_url" title="Quitar">
                                <span class="material-symbols-outlined">close</span></button>`;
                        bindRemoveImg(wrap, sec);
                    }
                    inp.value = '';
                    pushHistory("Imagen de sección actualizada");
                } else { toast("⚠️ " + (data.error || "Error")); }
            } catch(e) { toast("⚠️ Error de conexión"); }
        });
    });

    bindRemoveImg(itemEl, sec);

    if (sec.type === "cards") {
        bindCards(itemEl, sec);
        const addCardBtn = itemEl.querySelector(".ep-add-card");
        if (addCardBtn && !addCardBtn._b) {
            addCardBtn._b = true;
            addCardBtn.addEventListener("click", () => {
                const s = config.dynamic_sections.find(s => s.id === sec.id);
                if (!s) return;
                const card = { icon: "star", title: "Nueva Tarjeta", text: "Descripción." };
                s.cards.push(card);
                const idx = s.cards.length - 1;
                itemEl.querySelector(".ep-cards-list").insertAdjacentHTML("beforeend", cardHtml(sec.id, card, idx));
                bindCards(itemEl, s);
                postMessage("ADD_CARD", { secId: sec.id, card, idx });
                pushHistory("Tarjeta agregada");
            });
        }
    }
}

function bindRemoveImg(containerEl, sec) {
    containerEl.querySelectorAll(".ep-dyn-img-remove").forEach(btn => {
        if (btn._b) return; btn._b = true;
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const s = config.dynamic_sections.find(s => s.id === btn.dataset.sec);
            if (s) s.img_url = "";
            postMessage("UPDATE_SECTION", { secId: sec.id, field: "img_url", value: "" });
            const wrap = btn.closest(".ep-dyn-img-preview");
            if (wrap) wrap.innerHTML = `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin imagen</span></div>`;
            pushHistory("Imagen de sección eliminada");
        });
    });
}

function cardHtml(secId, card, idx) {
    return `
        <div class="ep-card-item" data-card="${idx}">
            <div class="ep-card-item-header">
                <span class="ep-card-label">Tarjeta ${idx + 1}</span>
                <button class="ep-card-del" data-sec="${secId}" data-card="${idx}">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
            <div class="ep-field"><label>Ícono</label>
                <input class="ep-input ep-card-f" data-sec="${secId}" data-card="${idx}" data-f="icon" value="${esc(card.icon||'star')}" placeholder="star, church..."></div>
            <div class="ep-field"><label>Título</label>
                <input class="ep-input ep-card-f" data-sec="${secId}" data-card="${idx}" data-f="title" value="${esc(card.title||'')}"></div>
            <div class="ep-field"><label>Descripción</label>
                <textarea class="ep-input ep-textarea ep-card-f" data-sec="${secId}" data-card="${idx}" data-f="text">${esc(card.text||'')}</textarea></div>
        </div>`;
}

function bindCards(itemEl, sec) {
    itemEl.querySelectorAll(".ep-card-f").forEach(inp => {
        if (inp._b) return; inp._b = true;
        inp.addEventListener("input", () => {
            const s = config.dynamic_sections.find(s => s.id === inp.dataset.sec);
            const i = parseInt(inp.dataset.card);
            if (!s || !s.cards[i]) return;
            s.cards[i][inp.dataset.f] = inp.value;
            postMessage("UPDATE_CARD", { secId: sec.id, cardIdx: i, field: inp.dataset.f, value: inp.value });
            // pushHistory automático por input
        });
    });
    itemEl.querySelectorAll(".ep-card-del").forEach(btn => {
        if (btn._b) return; btn._b = true;
        btn.addEventListener("click", () => {
            const s = config.dynamic_sections.find(s => s.id === btn.dataset.sec);
            const i = parseInt(btn.dataset.card);
            if (!s) return;
            s.cards.splice(i, 1);
            const list = itemEl.querySelector(".ep-cards-list");
            list.innerHTML = s.cards.map((c, idx) => cardHtml(sec.id, c, idx)).join("");
            bindCards(itemEl, s);
            postMessage("REMOVE_CARD", { secId: sec.id, cardIdx: i });
            pushHistory("Tarjeta eliminada");
        });
    });
}