/* ═══════════════════════════════════════════════════════
   EDITOR_PAGE.JS — lógica completa del editor full screen (CORREGIDO)
═══════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Editor JS cargado");

    // ── Estado ──
    let config = {};
    try {
        config = JSON.parse(document.getElementById("epConfigData")?.textContent || "{}");
    } catch(e) { config = {}; }
    if (!Array.isArray(config.dynamic_sections)) config.dynamic_sections = [];

    // ── Refs ──
    const iframe     = document.getElementById("epPreviewIframe");
    const iframeWrap = document.getElementById("epIframeContainer");
    const saveBtn    = document.getElementById("epSaveBtn");
    const resetBtn   = document.getElementById("epResetBtn");
    const reloadBtn  = document.getElementById("epReloadBtn");
    const addSecBtn  = document.getElementById("epAddSectionBtn");
    const dynList    = document.getElementById("epDynamicList");

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
    document.querySelectorAll(".ep-input[data-key]").forEach(input => {
        input.addEventListener("input", () => {
            const key = input.dataset.key;
            const val = input.value;
            config[key] = val;
            post("UPDATE_FIELD", { key, value: val });
            // Sincronizar color picker ↔ text input
            if (key.startsWith("color_")) {
                document.querySelectorAll(`[data-key="${key}"]`).forEach(el => {
                    if (el !== input) el.value = val;
                });
            }
        });
    });

    // ══════════════════════════════════════
    // PLANTILLAS — guardar antes de recargar
    // ══════════════════════════════════════
    document.querySelectorAll(".ep-template-item").forEach(item => {
        item.addEventListener("click", async () => {
            document.querySelectorAll(".ep-template-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            config.template = item.dataset.template;
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
    const presets = {
        default: { color_bg_primary: "#0d1b2a", color_accent: "#c9a84c", color_text: "#f0f4f8" },
        emerald: { color_bg_primary: "#0a1628", color_accent: "#10b981", color_text: "#ecfdf5" },
        sunset:  { color_bg_primary: "#1a0a0a", color_accent: "#ef4444", color_text: "#fff7f7" },
        ocean:   { color_bg_primary: "#0c1a2e", color_accent: "#3b82f6", color_text: "#eff6ff" },
        purple:  { color_bg_primary: "#13001f", color_accent: "#a855f7", color_text: "#faf5ff" },
        rose:    { color_bg_primary: "#1a0010", color_accent: "#f43f5e", color_text: "#fff1f2" },
    };

    document.querySelectorAll(".ep-color-preset").forEach(btn => {
        btn.addEventListener("click", () => {
            const preset = presets[btn.dataset.preset];
            if (!preset) return;
            document.querySelectorAll(".ep-color-preset").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            Object.entries(preset).forEach(([key, value]) => {
                config[key] = value;
                document.querySelectorAll(`[data-key="${key}"]`).forEach(el => el.value = value);
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

    document.querySelectorAll(".ep-type-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".ep-type-btn").forEach(b => b.classList.remove("active"));
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
        console.log("Agregar sección click, tipo:", selectedSectionType);
        const type     = selectedSectionType;
        const position = getSelectedPosition();

        const defaults = {
            cards: {
                title:    "Nueva Sección",
                subtitle: "",
                nav_label:"Sección",
                cards:    [{ icon: "star", title: "Tarjeta", text: "Descripción de la tarjeta." }]
            },
            banner: {
                title:      "Tu Mensaje Principal",
                subtitle:   "Un subtítulo que acompaña y refuerza la idea central.",
                btn_text:   "Saber más",
                btn_url:    "#",
                img_url:    "",
            },
            split: {
                title:     "Título del Bloque",
                subtitle:  "Describí acá tu mensaje con un poco más de detalle.",
                btn_text:  "Ver más",
                btn_url:   "#",
                img_url:   "",
                img_side:  "right",
            }
        };

        const nueva = {
            id:       "sec_" + Date.now(),
            type,
            position,
            ...defaults[type]
        };

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

        const bodyHtml = buildDynBody(sec);

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
                ${bodyHtml}
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
                </button>
            `;
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
                </div>
            `;
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
                </div>
            `;
        }
        return "";
    }

    function bindDynFields(itemEl, sec) {
        // Campos de texto
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

        // Upload buttons (abrir selector de archivos)
        itemEl.querySelectorAll(".ep-dyn-upload-btn").forEach(btn => {
            if (btn._b) return; btn._b = true;
            btn.addEventListener("click", () => {
                const inputId = btn.dataset.input;
                console.log("Click en upload btn, inputId:", inputId);
                document.getElementById(inputId)?.click();
            });
        });

        // Inputs file (subida de imagen)
        itemEl.querySelectorAll('input[type="file"]').forEach(inp => {
            if (inp._b) return; inp._b = true;
            inp.addEventListener("change", async (e) => {
                console.log("Change en input file, sec:", sec.id);
                const file = e.target.files[0];
                if (!file) return;

                // Determinar si es banner o split por el id del input
                const isBanner = inp.id.includes("Banner");
                const previewId = isBanner ? `epBannerImg_${sec.id}` : `epSplitImg_${sec.id}`;
                const wrap = document.getElementById(previewId);

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
                            wrap.innerHTML = `
                                <img src="${data.url}" style="width:100%;height:100%;object-fit:cover">
                                <button class="ep-img-remove ep-dyn-img-remove" data-sec="${sec.id}" data-field="img_url" title="Quitar">
                                    <span class="material-symbols-outlined">close</span>
                                </button>
                            `;
                            bindRemoveImg(wrap, sec);
                        }
                        inp.value = ''; // reset para permitir subir el mismo archivo de nuevo
                    } else {
                        toast("⚠️ " + (data.error || "Error"));
                    }
                } catch(e) {
                    toast("⚠️ Error de conexión");
                    console.error(e);
                }
            });
        });

        // Botones de quitar imagen dentro del item
        bindRemoveImg(itemEl, sec);

        // Cards (solo tipo cards)
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
                if (wrap) {
                    wrap.innerHTML = `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin imagen</span></div>`;
                }
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
            </div>
        `;
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
            console.error(e);
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
        } catch(e) {
            toast("⚠️ Error al eliminar imagen");
            console.error(e);
        }
    }

    function updateImagePreview(wrap, url, configKey) {
        if (url) {
            wrap.innerHTML = `
                <img src="${url}" alt="preview" style="width:100%;height:100%;object-fit:cover">
                <button class="ep-img-remove" data-key="${configKey}" title="Quitar imagen">
                    <span class="material-symbols-outlined">close</span>
                </button>
            `;
            wrap.querySelector(".ep-img-remove").addEventListener("click", (e) => {
                e.stopPropagation();
                quitarImagen(configKey, wrap);
            });
        } else {
            wrap.innerHTML = `
                <div class="ep-img-empty">
                    <span class="material-symbols-outlined">image</span>
                    <span>Sin imagen</span>
                </div>
            `;
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
                document.getElementById("epLogoPreview").src = url;
                document.getElementById("epTopbarLogo").src  = url;
            }
            input.value = '';
        });
    }

    bindUpload("epLogoUpload",     "logo_url",      "epLogoPrevWrap");
    bindUpload("epHeroBgUpload",   "hero_bg_url",   "epHeroBgPreview");
    bindUpload("epAboutImgUpload", "about_img_url", "epAboutImgPreview");

    // ══════════════════════════════════════
    // GUARDAR
    // ══════════════════════════════════════
    saveBtn?.addEventListener("click", async () => {
        console.log("Guardar click");
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span> Guardando...`;
        const fd = new FormData();
        fd.append("config", JSON.stringify(config));
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            const res  = await fetch("/editor/guardar/", { method: "POST", body: fd });
            const data = await res.json();
            if (data.ok) {
                toast("Cambios guardados");
            } else {
                toast("⚠️ " + (data.error || "Error desconocido"));
            }
        } catch(e) {
            toast("⚠️ Error de conexión");
            console.error(e);
        } finally {
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
            if (data.ok) {
                toast("Reseteado. Recargando...");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                toast("⚠️ Error al resetear");
            }
        } catch(e) {
            toast("⚠️ Error de conexión");
            console.error(e);
        }
    });

    // ══════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════
    function toast(msg) {
        console.log("Toast:", msg);
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
});