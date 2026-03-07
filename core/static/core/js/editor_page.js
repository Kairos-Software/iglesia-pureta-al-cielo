/* ═══════════════════════════════════════════════════════
   EDITOR_PAGE.JS — completo y corregido
═══════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Editor JS cargado");

    // ── Estado ──
    let config = {};
    try {
        config = JSON.parse(document.getElementById("epConfigData")?.textContent || "{}");
    } catch(e) { config = {}; }
    if (!Array.isArray(config.dynamic_sections)) config.dynamic_sections = [];
    if (!Array.isArray(config.events))           config.events = [];
    if (!Array.isArray(config.ads))              config.ads = [];
    if (!Array.isArray(config.footer_links))     config.footer_links = [];

    // ── Refs ──
    const iframe     = document.getElementById("epPreviewIframe");
    const iframeWrap = document.getElementById("epIframeContainer");
    const saveBtn    = document.getElementById("epSaveBtn");
    const resetBtn   = document.getElementById("epResetBtn");
    const reloadBtn  = document.getElementById("epReloadBtn");
    const addSecBtn  = document.getElementById("epAddSectionBtn");
    const dynList    = document.getElementById("epDynamicList");

    // ══════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════
    function toast(msg) {
        const el   = document.getElementById("epToast");
        const text = document.getElementById("epToastText");
        if (!el || !text) return;
        text.textContent = msg;
        el.classList.add("show");
        setTimeout(() => el.classList.remove("show"), 3000);
    }

    function getCookie(name) {
        let val = null;
        document.cookie.split(";").forEach(c => {
            c = c.trim();
            if (c.startsWith(name + "=")) val = decodeURIComponent(c.slice(name.length + 1));
        });
        return val;
    }

    function esc(s) {
        return String(s || "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function normalizeColor(color) {
        if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
            return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        return color;
    }

    // ── postMessage al iframe ──
    function post(type, payload) {
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type, payload }, "*");
        }
    }

    iframe?.addEventListener("load", () => {
        console.log("Iframe cargado, enviando INIT_CONFIG");
        setTimeout(() => post("INIT_CONFIG", config), 300);
    });

    // ══════════════════════════════════════
    // TABS
    // ══════════════════════════════════════
    document.querySelectorAll(".ep-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".ep-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".ep-tab-content").forEach(c => c.classList.remove("active"));
            tab.classList.add("active");
            const content = document.querySelector(`[data-tab-content="${tab.dataset.tab}"]`);
            if (content) content.classList.add("active");
        });
    });

    // ══════════════════════════════════════
    // INPUTS — live update
    // ══════════════════════════════════════
    document.querySelectorAll(".ep-input[data-key]:not(input[type='color'])").forEach(input => {
        input.addEventListener("input", () => {
            const key = input.dataset.key;
            let val = input.value;
            if (key.startsWith("color_")) {
                val = normalizeColor(val);
                input.value = val;
            }
            config[key] = val;
            post("UPDATE_FIELD", { key, value: val });
            if (key.startsWith("color_")) {
                document.querySelectorAll(`[data-key="${key}"]`).forEach(el => {
                    if (el !== input && el.type !== 'color') el.value = val;
                });
                document.querySelectorAll(`input[type="color"][data-key="${key}"]`).forEach(el => {
                    el.value = val;
                });
            }
        });
    });

    document.querySelectorAll('input[type="color"][data-key]').forEach(input => {
        ['input', 'change'].forEach(eventType => {
            input.addEventListener(eventType, () => {
                const key = input.dataset.key;
                let val = normalizeColor(input.value);
                config[key] = val;
                post("UPDATE_FIELD", { key, value: val });
                document.querySelectorAll(`.ep-input[data-key="${key}"]:not(input[type='color'])`).forEach(el => {
                    el.value = val;
                });
            });
        });
    });

    // ── Toggles (checkboxes con data-key) ──
    document.querySelectorAll('input[type="checkbox"][data-key]').forEach(chk => {
        chk.addEventListener("change", () => {
            config[chk.dataset.key] = chk.checked;
            post("UPDATE_FIELD", { key: chk.dataset.key, value: chk.checked });
        });
    });

    // ══════════════════════════════════════
    // PLANTILLAS
    // Lee los defaults directamente desde el JSON que inyecta Python.
    // Cuando cambiás el CSS de un template, esto se actualiza solo —
    // no hay nada hardcodeado acá.
    // ══════════════════════════════════════
    const TEMPLATE_DEFAULTS = JSON.parse(
        document.getElementById("epTemplateDefaults")?.textContent || "{}"
    );

    document.querySelectorAll(".ep-template-item").forEach(item => {
        item.addEventListener("click", async () => {
            const tplId = item.dataset.template;

            document.querySelectorAll(".ep-template-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            config.template = tplId;

            const defaults = TEMPLATE_DEFAULTS[tplId];
            if (defaults) {
                Object.entries(defaults).forEach(([key, value]) => {
                    config[key] = value;
                    document.querySelectorAll(`[data-key="${key}"]`).forEach(el => {
                        el.value = value;
                    });
                    document.querySelectorAll(`select[data-key="${key}"]`).forEach(sel => {
                        sel.value = value;
                    });
                });
                updateFontPreview();
            }

            await guardarConfigSilencioso();
            iframe.src = iframe.src;
        });
    });

    async function guardarConfigSilencioso() {
        const fd = new FormData();
        fd.append("config", JSON.stringify(config));
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            await fetch("/editor/guardar/", { method: "POST", body: fd });
        } catch(e) {
            console.error("Error guardando silenciosamente:", e);
        }
    }

    // ══════════════════════════════════════
    // PALETAS DE COLOR
    // ══════════════════════════════════════
    const colorPresets = {
        default: { color_bg_primary: "#0d1b2a", color_accent: "#c9a84c", color_text: "#f0f4f8" },
        emerald: { color_bg_primary: "#0a1628", color_accent: "#10b981", color_text: "#ecfdf5" },
        sunset:  { color_bg_primary: "#1a0a0a", color_accent: "#ef4444", color_text: "#fff7f7" },
        ocean:   { color_bg_primary: "#0c1a2e", color_accent: "#3b82f6", color_text: "#eff6ff" },
        purple:  { color_bg_primary: "#13001f", color_accent: "#a855f7", color_text: "#faf5ff" },
        rose:    { color_bg_primary: "#1a0010", color_accent: "#f43f5e", color_text: "#fff1f2" },
    };

    document.querySelectorAll(".ep-color-preset").forEach(btn => {
        btn.addEventListener("click", () => {
            const preset = colorPresets[btn.dataset.preset];
            if (!preset) return;
            document.querySelectorAll(".ep-color-preset").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            Object.entries(preset).forEach(([key, value]) => {
                config[key] = value;
                document.querySelectorAll(`[data-key="${key}"]`).forEach(el => { el.value = value; });
                post("UPDATE_FIELD", { key, value });
            });
        });
    });

    // ══════════════════════════════════════
    // FONT PREVIEW
    // ══════════════════════════════════════
    const fontPreviewTitle = document.querySelector(".ep-font-preview-title");
    const fontPreviewBody  = document.querySelector(".ep-font-preview-body");

    function updateFontPreview() {
        const displayFont = config.font_display || "Cormorant Garamond";
        const bodyFont    = config.font_body    || "DM Sans";
        if (fontPreviewTitle) fontPreviewTitle.style.fontFamily = `'${displayFont}', serif`;
        if (fontPreviewBody)  fontPreviewBody.style.fontFamily  = `'${bodyFont}', sans-serif`;
        loadGoogleFontLocal(displayFont);
        loadGoogleFontLocal(bodyFont);
    }

    document.querySelectorAll(".ep-select[data-key]").forEach(sel => {
        sel.addEventListener("change", () => {
            config[sel.dataset.key] = sel.value;
            post("UPDATE_FIELD", { key: sel.dataset.key, value: sel.value });
            updateFontPreview();
        });
    });

    updateFontPreview();

    function loadGoogleFontLocal(fontName) {
        const id = `gfont-ep-${fontName.replace(/\s/g, "-")}`;
        if (document.getElementById(id)) return;
        const link = document.createElement("link");
        link.id   = id;
        link.rel  = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;600;700&display=swap`;
        document.head.appendChild(link);
    }

    // ══════════════════════════════════════
    // DEVICE PREVIEW
    // ══════════════════════════════════════
    document.querySelectorAll(".ep-device-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".ep-device-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            iframeWrap.dataset.device = btn.dataset.device;
        });
    });

    reloadBtn?.addEventListener("click", () => { iframe.src = iframe.src; });

    // ══════════════════════════════════════
    // SELECTOR DE TIPO DE SECCIÓN
    // ══════════════════════════════════════
    let selectedSectionType = "cards";

    document.querySelectorAll(".ep-type-btn[data-type]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".ep-type-btn[data-type]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedSectionType = btn.dataset.type;
        });
    });

    function getSelectedPosition() {
        const radio = document.querySelector('input[name="secPosition"]:checked');
        return radio ? radio.value : "before_contact";
    }

    // ══════════════════════════════════════
    // SECCIONES DINÁMICAS
    // ══════════════════════════════════════
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

    renderDynSections();

    addSecBtn?.addEventListener("click", () => {
        const type     = selectedSectionType;
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
        post("ADD_SECTION", { section: nueva });
        setTimeout(() => dynList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    });

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
            post("REMOVE_SECTION", { secId: sec.id });
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
                    ${(sec.cards||[]).map((c,i) => cardHtml(sec.id,c,i)).join("")}
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
                post("UPDATE_SECTION", { secId: sec.id, field: inp.dataset.f, value: inp.value });
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
                        post("UPDATE_SECTION", { secId: sec.id, field: "img_url", value: data.url });
                        if (wrap) {
                            wrap.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:cover">
                                <button class="ep-img-remove ep-dyn-img-remove" data-sec="${sec.id}" data-field="img_url" title="Quitar">
                                    <span class="material-symbols-outlined">close</span></button>`;
                            bindRemoveImg(wrap, sec);
                        }
                        inp.value = '';
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
                    post("ADD_CARD", { secId: sec.id, card, idx });
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
                post("UPDATE_SECTION", { secId: sec.id, field: "img_url", value: "" });
                const wrap = btn.closest(".ep-dyn-img-preview");
                if (wrap) wrap.innerHTML = `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin imagen</span></div>`;
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
                post("UPDATE_CARD", { secId: sec.id, cardIdx: i, field: inp.dataset.f, value: inp.value });
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
                post("REMOVE_CARD", { secId: sec.id, cardIdx: i });
            });
        });
    }

    // ══════════════════════════════════════
    // UPLOAD DE IMÁGENES (globales)
    // ══════════════════════════════════════
    async function uploadImage(file, configKey, previewEl) {
        if (!file) return null;
        if (file.size > 5 * 1024 * 1024) { toast("⚠️ Imagen demasiado grande (máx. 5MB)"); return null; }
        const fd = new FormData();
        fd.append("image", file);
        fd.append("key", configKey);
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            const res  = await fetch("/editor/upload-imagen/", { method: "POST", body: fd });
            const data = await res.json();
            if (data.ok && data.url) {
                config[configKey] = data.url;
                post("UPDATE_FIELD", { key: configKey, value: data.url });
                if (previewEl) updateImagePreview(previewEl, data.url, configKey);
                return data.url;
            } else {
                toast("⚠️ " + (data.error || "Error desconocido"));
                return null;
            }
        } catch(e) {
            toast("⚠️ Error de conexión");
            return null;
        }
    }

    async function quitarImagen(configKey, previewEl) {
        const fd = new FormData();
        fd.append("key", configKey);
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            const res  = await fetch("/editor/quitar-imagen/", { method: "POST", body: fd });
            const data = await res.json();
            if (data.ok) {
                config[configKey] = "";
                post("UPDATE_FIELD", { key: configKey, value: "" });
                if (previewEl) updateImagePreview(previewEl, "", configKey);
                toast("Imagen eliminada");
            }
        } catch(e) { toast("⚠️ Error al eliminar imagen"); }
    }

    function updateImagePreview(wrap, url, configKey) {
        if (url) {
            wrap.innerHTML = `
                <img src="${url}" alt="preview" style="width:100%;height:100%;object-fit:cover">
                <button class="ep-img-remove" data-key="${configKey}" title="Quitar imagen">
                    <span class="material-symbols-outlined">close</span>
                </button>`;
            wrap.querySelector(".ep-img-remove").addEventListener("click", (e) => {
                e.stopPropagation();
                quitarImagen(configKey, wrap);
            });
        } else {
            wrap.innerHTML = `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin imagen</span></div>`;
        }
    }

    function bindUpload(inputId, configKey, previewId) {
        const input   = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (!input) return;
        if (preview && config[configKey]) updateImagePreview(preview, config[configKey], configKey);
        else if (preview) updateImagePreview(preview, "", configKey);
        input.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            const url = await uploadImage(file, configKey, preview);
            if (url && configKey === "logo_url") {
                const lp = document.getElementById("epLogoPreview");
                const tl = document.getElementById("epTopbarLogo");
                if (lp) lp.src = url;
                if (tl) tl.src = url;
            }
            input.value = '';
        });
    }

    bindUpload("epLogoUpload",     "logo_url",      "epLogoPrevWrap");
    bindUpload("epHeroBgUpload",   "hero_bg_url",   "epHeroBgPreview");
    bindUpload("epAboutImgUpload", "about_img_url", "epAboutImgPreview");
    bindUpload("epOgImgUpload",    "og_img_url",    "epOgImgPreview");

    // ══════════════════════════════════════
    // GUARDAR
    // ══════════════════════════════════════
    saveBtn?.addEventListener("click", async () => {
        pushHistory("Guardado manual");
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span> Guardando...`;
        const fd = new FormData();
        fd.append("config", JSON.stringify(config));
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            const res  = await fetch("/editor/guardar/", { method: "POST", body: fd });
            const data = await res.json();
            if (data.ok) { toast("Cambios guardados"); }
            else { toast("⚠️ " + (data.error || "Error desconocido")); }
        } catch(e) { toast("⚠️ Error de conexión"); }
        finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<span class="material-symbols-outlined">check</span> Guardar`;
        }
    });

    // ══════════════════════════════════════
    // RESETEAR
    // ══════════════════════════════════════
    resetBtn?.addEventListener("click", async () => {
        if (!confirm("¿Resetear todo a los valores por defecto? Esta acción no se puede deshacer.")) return;
        const fd = new FormData();
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            const res  = await fetch("/editor/resetear/", { method: "POST", body: fd });
            const data = await res.json();
            if (data.ok) { toast("Reseteado. Recargando..."); setTimeout(() => window.location.reload(), 1000); }
            else { toast("⚠️ Error al resetear"); }
        } catch(e) { toast("⚠️ Error de conexión"); }
    });

    // ══════════════════════════════════════
    // HISTORIAL AUTOMÁTICO
    // ══════════════════════════════════════
    const HISTORY_MAX = 5;
    let editorHistory = [];

    function pushHistory(label) {
        const snap = { ts: Date.now(), label: label || "Cambio", data: JSON.parse(JSON.stringify(config)) };
        editorHistory.unshift(snap);
        if (editorHistory.length > HISTORY_MAX) editorHistory.pop();
        renderHistory();
    }

    function renderHistory() {
        const list  = document.getElementById("epHistoryList");
        const empty = document.getElementById("epHistoryEmpty");
        if (!list) return;
        if (editorHistory.length === 0) {
            list.innerHTML = "";
            if (empty) empty.style.display = "";
            return;
        }
        if (empty) empty.style.display = "none";
        list.innerHTML = editorHistory.map((h, i) => {
            const time = new Date(h.ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
            return `
                <div class="ep-history-item" data-hidx="${i}">
                    <span class="ep-history-time">${time}</span>
                    <span class="ep-history-label">${esc(h.label)}</span>
                    <span class="ep-history-restore">
                        <span class="material-symbols-outlined">restore</span> Restaurar
                    </span>
                </div>`;
        }).join("");

        list.querySelectorAll(".ep-history-item").forEach(el => {
            el.addEventListener("click", () => {
                const snap = editorHistory[parseInt(el.dataset.hidx)];
                if (!snap) return;
                const time = new Date(snap.ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                if (!confirm(`¿Restaurar al estado de las ${time}?`)) return;
                Object.assign(config, snap.data);
                document.querySelectorAll("[data-key]").forEach(inp => {
                    const k = inp.dataset.key;
                    if (config[k] !== undefined) inp.value = config[k];
                });
                post("INIT_CONFIG", config);
                toast("Estado restaurado");
            });
        });
    }

    let historyDebounce = null;
    document.querySelectorAll(".ep-input[data-key]").forEach(inp => {
        inp.addEventListener("input", () => {
            clearTimeout(historyDebounce);
            historyDebounce = setTimeout(() => pushHistory("Edición de campo"), 2000);
        });
    });

    // ══════════════════════════════════════
    // EXPORTAR / IMPORTAR JSON
    // ══════════════════════════════════════
    document.getElementById("epExportJsonBtn")?.addEventListener("click", () => {
        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        const name = (config.org_name || "config").replace(/\s+/g, "_").toLowerCase();
        a.href = url; a.download = `${name}_config.json`; a.click();
        URL.revokeObjectURL(url);
        toast("Configuración exportada");
    });

    document.getElementById("epImportJsonBtn")?.addEventListener("click", () => {
        document.getElementById("epImportJsonInput")?.click();
    });

    document.getElementById("epImportJsonInput")?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target.result);
                if (typeof imported !== "object" || Array.isArray(imported)) throw new Error("Formato inválido");
                pushHistory("Antes de importar");
                Object.assign(config, imported);
                document.querySelectorAll("[data-key]").forEach(inp => {
                    const k = inp.dataset.key;
                    if (config[k] !== undefined) inp.value = config[k];
                });
                post("INIT_CONFIG", config);
                toast("Configuración importada");
            } catch(err) { toast("⚠️ Archivo JSON inválido"); }
        };
        reader.readAsText(file);
        e.target.value = "";
    });

    // ══════════════════════════════════════
    // PRESETS PERSONALIZADOS (localStorage)
    // ══════════════════════════════════════
    const PRESETS_KEY = "ep_custom_presets";

    function loadStoredPresets() {
        try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]"); } catch(e) { return []; }
    }
    function saveStoredPresets(p) { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); }

    function renderPresets() {
        const list = document.getElementById("epPresetsList");
        if (!list) return;
        const presets = loadStoredPresets();
        if (presets.length === 0) {
            list.innerHTML = `<p style="font-size:12px;color:var(--ep-text-muted);text-align:center;padding:8px 0">Sin presets guardados</p>`;
            return;
        }
        list.innerHTML = presets.map((p, i) => `
            <div class="ep-preset-item">
                <span class="ep-preset-name">${esc(p.name)}</span>
                <span class="ep-preset-date">${p.date}</span>
                <button class="ep-preset-load" data-pidx="${i}">Cargar</button>
                <button class="ep-preset-del" data-pidx="${i}">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>`).join("");

        list.querySelectorAll(".ep-preset-load").forEach(btn => {
            btn.addEventListener("click", () => {
                const p = loadStoredPresets()[parseInt(btn.dataset.pidx)];
                if (!p || !confirm(`¿Cargar preset "${p.name}"?`)) return;
                pushHistory("Antes de cargar preset");
                Object.assign(config, p.data);
                document.querySelectorAll("[data-key]").forEach(inp => {
                    const k = inp.dataset.key;
                    if (config[k] !== undefined) inp.value = config[k];
                });
                post("INIT_CONFIG", config);
                toast(`Preset "${p.name}" cargado`);
            });
        });

        list.querySelectorAll(".ep-preset-del").forEach(btn => {
            btn.addEventListener("click", () => {
                const presets = loadStoredPresets();
                presets.splice(parseInt(btn.dataset.pidx), 1);
                saveStoredPresets(presets);
                renderPresets();
                toast("Preset eliminado");
            });
        });
    }

    document.getElementById("epSavePresetBtn")?.addEventListener("click", () => {
        const nameInp = document.getElementById("epPresetName");
        const name = nameInp?.value?.trim();
        if (!name) { toast("⚠️ Escribí un nombre para el preset"); return; }
        const presets = loadStoredPresets();
        presets.unshift({ name, date: new Date().toLocaleDateString("es-AR"), data: JSON.parse(JSON.stringify(config)) });
        if (presets.length > 20) presets.pop();
        saveStoredPresets(presets);
        if (nameInp) nameInp.value = "";
        renderPresets();
        toast(`Preset "${name}" guardado`);
    });

    renderPresets();

    // ══════════════════════════════════════
    // MODO MANTENIMIENTO
    // ══════════════════════════════════════
    const maintenanceToggle  = document.getElementById("epMaintenanceToggle");
    const maintenanceWarning = document.getElementById("epMaintenanceWarning");

    maintenanceToggle?.addEventListener("change", () => {
        const active = maintenanceToggle.checked;
        config.maintenance_mode = active;
        post("UPDATE_FIELD", { key: "maintenance_mode", value: active });
        if (maintenanceWarning) maintenanceWarning.style.display = active ? "flex" : "none";
    });

    // ══════════════════════════════════════
    // SEO — preview en vivo
    // ══════════════════════════════════════
    function updateSeoPreview() {
        const titleEl = document.getElementById("epSeoPreviewTitle");
        const descEl  = document.getElementById("epSeoPreviewDesc");
        if (titleEl) titleEl.textContent = config.seo_title || config.org_name || "Título de página";
        if (descEl)  descEl.textContent  = config.seo_description || "Descripción meta de tu sitio...";
    }
    document.querySelector('[data-key="seo_title"]')?.addEventListener("input", updateSeoPreview);
    document.querySelector('[data-key="seo_description"]')?.addEventListener("input", updateSeoPreview);
    updateSeoPreview();

    // ══════════════════════════════════════
    // FOOTER LINKS
    // ══════════════════════════════════════
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
                post("UPDATE_FIELD", { key: "footer_links", value: config.footer_links });
            });
        });
        list.querySelectorAll(".ep-fl-url").forEach(inp => {
            inp.addEventListener("input", () => {
                const i = parseInt(inp.dataset.idx);
                if (config.footer_links[i]) config.footer_links[i].url = inp.value;
                post("UPDATE_FIELD", { key: "footer_links", value: config.footer_links });
            });
        });
        list.querySelectorAll(".ep-footer-link-del").forEach(btn => {
            btn.addEventListener("click", () => {
                config.footer_links.splice(parseInt(btn.dataset.idx), 1);
                renderFooterLinks();
                post("UPDATE_FIELD", { key: "footer_links", value: config.footer_links });
            });
        });
    }

    document.getElementById("epAddFooterLinkBtn")?.addEventListener("click", () => {
        if (config.footer_links.length >= 6) { toast("⚠️ Máximo 6 links en el footer"); return; }
        config.footer_links.push({ label: "", url: "" });
        renderFooterLinks();
        post("UPDATE_FIELD", { key: "footer_links", value: config.footer_links });
    });

    renderFooterLinks();

    // ══════════════════════════════════════
    // EVENTOS
    // ══════════════════════════════════════
    const evtHasBtnToggle = document.getElementById("epEvtHasBtn");
    const evtBtnFields    = document.querySelector(".ep-evt-btn-fields");

    evtHasBtnToggle?.addEventListener("change", () => {
        if (evtBtnFields) evtBtnFields.style.display = evtHasBtnToggle.checked ? "block" : "none";
    });

    document.getElementById("epEvtImgBtn")?.addEventListener("click", () => {
        document.getElementById("epEvtImgUpload")?.click();
    });

    let evtImgUrl = "";

    document.getElementById("epEvtImgUpload")?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const preview = document.getElementById("epEvtImgPreview");
        const fd = new FormData();
        fd.append("image", file);
        fd.append("key", "evt_temp_img");
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            const res  = await fetch("/editor/upload-imagen/", { method: "POST", body: fd });
            const data = await res.json();
            if (data.ok && data.url) {
                evtImgUrl = data.url;
                if (preview) preview.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:cover">`;
            } else { toast("⚠️ " + (data.error || "Error")); }
        } catch(err) { toast("⚠️ Error de conexión"); }
        e.target.value = "";
    });

    function renderEvents() {
        const list = document.getElementById("epEventsList");
        if (!list) return;
        if (config.events.length === 0) {
            list.innerHTML = `<p style="font-size:12px;color:var(--ep-text-muted);text-align:center;padding:12px 0">Sin eventos agregados</p>`;
            return;
        }
        list.innerHTML = "";
        config.events.forEach((ev, i) => {
            const item = document.createElement("div");
            item.className = "ep-event-item";
            const dateStr = ev.date
                ? new Date(ev.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })
                : "Sin fecha";
            item.innerHTML = `
                <div class="ep-event-header">
                    <span class="ep-event-date-badge">${dateStr}</span>
                    <span class="ep-event-name">${esc(ev.name || "Evento")}</span>
                    <span class="material-symbols-outlined ep-event-toggle">expand_more</span>
                </div>
                <div class="ep-event-body">
                    <div class="ep-event-info">
                        ${ev.date  ? `<div class="ep-event-info-row"><span class="material-symbols-outlined">calendar_month</span>${dateStr}${ev.time ? " · " + ev.time : ""}</div>` : ""}
                        ${ev.place ? `<div class="ep-event-info-row"><span class="material-symbols-outlined">location_on</span>${esc(ev.place)}</div>` : ""}
                        ${ev.desc  ? `<div class="ep-event-info-row"><span class="material-symbols-outlined">info</span>${esc(ev.desc)}</div>` : ""}
                    </div>
                    <div class="ep-dyn-actions">
                        <button class="ep-dyn-del-sec ep-evt-del" data-evidx="${i}">
                            <span class="material-symbols-outlined">delete</span> Eliminar evento
                        </button>
                    </div>
                </div>`;
            item.querySelector(".ep-event-header").addEventListener("click", () => item.classList.toggle("open"));
            item.querySelector(".ep-evt-del").addEventListener("click", () => {
                config.events.splice(i, 1);
                post("UPDATE_FIELD", { key: "events", value: config.events });
                renderEvents();
            });
            list.appendChild(item);
        });
    }

    document.getElementById("epAddEventBtn")?.addEventListener("click", () => {
        const name = document.getElementById("epEvtName")?.value?.trim();
        if (!name) { toast("⚠️ El evento necesita un nombre"); return; }

        const ev = {
            id:       "evt_" + Date.now(),
            name,
            desc:     document.getElementById("epEvtDesc")?.value    || "",
            date:     document.getElementById("epEvtDate")?.value     || "",
            time:     document.getElementById("epEvtTime")?.value     || "",
            place:    document.getElementById("epEvtPlace")?.value    || "",
            has_btn:  evtHasBtnToggle?.checked || false,
            btn_text: document.getElementById("epEvtBtnText")?.value  || "Inscribirse",
            btn_url:  document.getElementById("epEvtBtnUrl")?.value   || "#",
            img_url:  evtImgUrl || "",
        };

        config.events.push(ev);
        post("UPDATE_FIELD", { key: "events", value: config.events });
        renderEvents();
        pushHistory("Evento agregado");

        ["epEvtName","epEvtDesc","epEvtDate","epEvtTime","epEvtPlace","epEvtBtnText","epEvtBtnUrl"].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = "";
        });
        evtImgUrl = "";
        const evtPreview = document.getElementById("epEvtImgPreview");
        if (evtPreview) evtPreview.innerHTML = `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin imagen</span></div>`;
        if (evtHasBtnToggle) evtHasBtnToggle.checked = false;
        if (evtBtnFields)    evtBtnFields.style.display = "none";
        toast("Evento agregado ✓");
    });

    renderEvents();

    // ══════════════════════════════════════
    // ANUNCIOS / SPONSORS
    // ══════════════════════════════════════
    let selectedAdType = "banner";

    document.querySelectorAll(".ep-type-btn[data-adtype]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".ep-type-btn[data-adtype]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedAdType = btn.dataset.adtype;
            document.querySelectorAll(".ep-ad-fields").forEach(f => {
                f.style.display = (f.dataset.adtypeFields === selectedAdType) ? "" : "none";
            });
        });
    });

    document.querySelectorAll("[data-upload-for]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.getElementById(btn.dataset.uploadFor)?.click();
        });
    });

    let adBannerImgUrl   = "";
    let adSponsorLogoUrl = "";

    document.getElementById("epAdBannerUpload")?.addEventListener("change", async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const fd = new FormData();
        fd.append("image", file); fd.append("key", "ad_banner_temp");
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            const res  = await fetch("/editor/upload-imagen/", { method: "POST", body: fd });
            const data = await res.json();
            if (data.ok && data.url) {
                adBannerImgUrl = data.url;
                const prev = document.getElementById("epAdBannerPreview");
                if (prev) prev.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:cover">`;
            } else { toast("⚠️ " + (data.error || "Error")); }
        } catch(err) { toast("⚠️ Error de conexión"); }
        e.target.value = "";
    });

    document.getElementById("epAdSponsorLogoUpload")?.addEventListener("change", async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const fd = new FormData();
        fd.append("image", file); fd.append("key", "ad_sponsor_temp");
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            const res  = await fetch("/editor/upload-imagen/", { method: "POST", body: fd });
            const data = await res.json();
            if (data.ok && data.url) {
                adSponsorLogoUrl = data.url;
                const prev = document.getElementById("epAdSponsorLogoPreview");
                if (prev) prev.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:contain;padding:4px">`;
            } else { toast("⚠️ " + (data.error || "Error")); }
        } catch(err) { toast("⚠️ Error de conexión"); }
        e.target.value = "";
    });

    const adNoticeBgColor     = document.getElementById("epAdNoticeBgColor");
    const adNoticeBgColorText = document.getElementById("epAdNoticeBgColorText");
    adNoticeBgColor?.addEventListener("input", () => {
        if (adNoticeBgColorText) adNoticeBgColorText.value = adNoticeBgColor.value;
    });
    adNoticeBgColorText?.addEventListener("input", () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(adNoticeBgColorText.value) && adNoticeBgColor)
            adNoticeBgColor.value = adNoticeBgColorText.value;
    });

    const AD_TYPE_ICONS  = { banner: "panorama", sponsor: "workspace_premium", notice: "notifications" };
    const AD_TYPE_LABELS = { banner: "Banner",   sponsor: "Sponsor",           notice: "Aviso" };

    function renderAds() {
        const list = document.getElementById("epAdsList");
        if (!list) return;
        if (config.ads.length === 0) {
            list.innerHTML = `<p style="font-size:12px;color:var(--ep-text-muted);text-align:center;padding:12px 0">Sin anuncios agregados</p>`;
            return;
        }
        list.innerHTML = "";
        config.ads.forEach((ad, i) => {
            const item = document.createElement("div");
            item.className = "ep-ad-item";
            const name = ad.type === "banner"  ? (ad.alt  || "Banner")
                       : ad.type === "sponsor" ? (ad.name || "Sponsor")
                       :                         (ad.title || "Aviso");
            item.innerHTML = `
                <div class="ep-ad-type-icon">
                    <span class="material-symbols-outlined">${AD_TYPE_ICONS[ad.type] || "campaign"}</span>
                </div>
                <div class="ep-ad-info">
                    <div class="ep-ad-name">${esc(name)}</div>
                    <div class="ep-ad-meta">${AD_TYPE_LABELS[ad.type] || ad.type}</div>
                </div>
                <button class="ep-ad-del" data-adidx="${i}">
                    <span class="material-symbols-outlined">delete</span>
                </button>`;
            item.querySelector(".ep-ad-del").addEventListener("click", () => {
                config.ads.splice(i, 1);
                post("UPDATE_FIELD", { key: "ads", value: config.ads });
                renderAds();
            });
            list.appendChild(item);
        });
    }

    document.getElementById("epAddAdBtn")?.addEventListener("click", () => {
        let ad = { type: selectedAdType };

        if (selectedAdType === "banner") {
            if (!adBannerImgUrl) { toast("⚠️ Subí una imagen para el banner"); return; }
            ad.img_url = adBannerImgUrl;
            ad.url     = document.getElementById("epAdBannerUrl")?.value || "#";
            ad.alt     = document.getElementById("epAdBannerAlt")?.value || "Banner";
            adBannerImgUrl = "";
            const prev = document.getElementById("epAdBannerPreview");
            if (prev) prev.innerHTML = `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin imagen</span></div>`;
            ["epAdBannerUrl","epAdBannerAlt"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });

        } else if (selectedAdType === "sponsor") {
            const name = document.getElementById("epAdSponsorName")?.value?.trim();
            if (!name) { toast("⚠️ El sponsor necesita un nombre"); return; }
            ad.logo_url = adSponsorLogoUrl;
            ad.name     = name;
            ad.url      = document.getElementById("epAdSponsorUrl")?.value || "#";
            adSponsorLogoUrl = "";
            const prev = document.getElementById("epAdSponsorLogoPreview");
            if (prev) prev.innerHTML = `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin logo</span></div>`;
            ["epAdSponsorName","epAdSponsorUrl"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });

        } else if (selectedAdType === "notice") {
            const title = document.getElementById("epAdNoticeTitle")?.value?.trim();
            if (!title) { toast("⚠️ El aviso necesita un título"); return; }
            ad.title    = title;
            ad.text     = document.getElementById("epAdNoticeText")?.value || "";
            ad.bg_color = adNoticeBgColor?.value || "#c9a84c";
            ["epAdNoticeTitle","epAdNoticeText"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
        }

        config.ads.push(ad);
        post("UPDATE_FIELD", { key: "ads", value: config.ads });
        renderAds();
        pushHistory("Anuncio agregado");
        toast("Anuncio agregado ✓");
    });

    renderAds();

}); // ← FIN DOMContentLoaded