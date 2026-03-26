/* ═══════════════════════════════════════════════════════
   BASE.JS — HLS Player + Chat + Nav + postMessage editor
   Versión con polling de estado + manejo robusto de modo radio
═══════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {

    // ══════════════════════════════════════
    // APLICAR CONFIG EN PÁGINA PÚBLICA
    // ══════════════════════════════════════
    const configScript = document.querySelector('script[id="epConfigData"], script[data-site-config]');
    if (configScript && window.parent === window) {
        try {
            const cfg = JSON.parse(configScript.textContent || configScript.dataset.siteConfig || "{}");
            if (cfg.color_bg_primary) {
                document.documentElement.style.setProperty("--bg2",  adjustBrightness(cfg.color_bg_primary,  8));
                document.documentElement.style.setProperty("--bg3",  adjustBrightness(cfg.color_bg_primary, 16));
                document.documentElement.style.setProperty("--card", adjustBrightness(cfg.color_bg_primary,  6));
            }
            if (cfg.color_accent) {
                document.documentElement.style.setProperty("--accent2",     adjustBrightness(cfg.color_accent, 20));
                document.documentElement.style.setProperty("--accent-glow", hexToRgba(cfg.color_accent, 0.15));
            }
            if (cfg.color_text) {
                document.documentElement.style.setProperty("--text-muted", hexToRgba(cfg.color_text, 0.5));
            }
        } catch(e) {}
    }

    // ══════════════════════════════════════
    // HLS PLAYER CON ESTADOS MEJORADOS Y POLLING
    // ══════════════════════════════════════
    const streamContainer = document.getElementById("streamContainer");
    const video           = document.getElementById("videoPlayer");
    const playOverlay     = document.getElementById("playOverlay");
    const loadingOverlay  = document.getElementById("loadingOverlay");
    const offlineOverlay  = document.getElementById("offlineOverlay");

    if (streamContainer && video) {
        let enVivo = streamContainer.dataset.onAir === "true";
        let urlHls = streamContainer.dataset.hlsUrl;
        let hls = null;
        let userRequestedPlay = false;      // indica si el usuario ya hizo clic en play
        let isStreamReady = false;           // indica si el manifest se cargó correctamente

        // Funciones para mostrar/ocultar overlays
        function showLoading() {
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (playOverlay) playOverlay.style.display = 'none';
            if (offlineOverlay) offlineOverlay.style.display = 'none';
        }
        function hideLoading() {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
        function showPlayOverlay() {
            if (playOverlay && !userRequestedPlay && enVivo) {
                playOverlay.style.display = 'flex';
            }
            hideLoading();
        }
        function showOffline() {
            if (offlineOverlay) offlineOverlay.style.display = 'flex';
            if (playOverlay) playOverlay.style.display = 'none';
            hideLoading();
        }
        function hideAllOverlays() {
            if (playOverlay) playOverlay.style.display = 'none';
            if (offlineOverlay) offlineOverlay.style.display = 'none';
            hideLoading();
        }

        // Destruir HLS y limpiar
        function destroyHls() {
            if (hls) {
                hls.destroy();
                hls = null;
            }
            video.pause();
            video.removeAttribute('src');
            video.load();
            isStreamReady = false;
            userRequestedPlay = false;
        }

        // Iniciar HLS con una URL
        function iniciarHls() {
            if (!enVivo || !urlHls) {
                showOffline();
                return;
            }

            destroyHls();
            showLoading();

            if (typeof Hls !== "undefined" && Hls.isSupported()) {
                hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    liveSyncDurationCount: 3,
                    liveMaxLatencyDurationCount: 10,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    manifestLoadingMaxRetry: 5,
                    manifestLoadingRetryDelay: 1000,
                });

                hls.loadSource(urlHls);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log("Manifest cargado, stream listo");
                    isStreamReady = true;
                    hideLoading();

                    if (userRequestedPlay) {
                        video.play().catch(e => {
                            console.warn("Error al reproducir:", e);
                            showPlayOverlay();
                        });
                    } else {
                        showPlayOverlay();
                    }
                });

                hls.on(Hls.Events.ERROR, (_, data) => {
                    if (!data.fatal) return;

                    console.error("Error HLS fatal:", data.type);
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        hls.startLoad();
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                    } else {
                        destroyHls();
                        showOffline();
                    }
                });
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                // Safari nativo
                video.src = urlHls;
                video.addEventListener("loadedmetadata", () => {
                    isStreamReady = true;
                    hideLoading();
                    if (userRequestedPlay) {
                        video.play().catch(() => showPlayOverlay());
                    } else {
                        showPlayOverlay();
                    }
                });
                video.addEventListener("error", () => {
                    destroyHls();
                    showOffline();
                });
            } else {
                console.error("HLS no soportado");
                showOffline();
            }
        }

        // ── Polling: consultar estado cada 3 segundos ──
        let lastKnownState = { onAir: enVivo, hlsUrl: urlHls };
        function checkStreamStatus() {
            fetch('/estado-canal/')
                .then(r => r.json())
                .then(data => {
                    const newOnAir = data.en_vivo === true;
                    const newHlsUrl = data.hls_url;
                    if (newOnAir !== lastKnownState.onAir || newHlsUrl !== lastKnownState.hlsUrl) {
                        console.log("Cambio de estado detectado:", { newOnAir, newHlsUrl });
                        lastKnownState = { onAir: newOnAir, hlsUrl: newHlsUrl };
                        enVivo = newOnAir;
                        urlHls = newHlsUrl;
                        // Actualizar barra de estado
                        const statusBar = document.querySelector('.player-status-bar');
                        const statusDot = document.querySelector('.status-dot');
                        if (statusBar) {
                            statusBar.classList.toggle('live', enVivo);
                            statusBar.querySelector('span:last-child').textContent = enVivo ? 'EN VIVO' : 'FUERA DE LÍNEA';
                        }
                        if (statusDot) statusDot.classList.toggle('live', enVivo);

                        if (enVivo && urlHls) {
                            // Si hay stream activo, reiniciar reproductor
                            userRequestedPlay = false; // resetear para que muestre play overlay
                            iniciarHls();
                        } else {
                            destroyHls();
                            showOffline();
                        }
                    }
                })
                .catch(e => console.warn("Polling error:", e));
        }

        // Iniciar reproductor por primera vez
        iniciarHls();

        // Iniciar polling
        setInterval(checkStreamStatus, 3000);

        // Manejar clic en botón play
        if (playOverlay && document.getElementById("playBtn")) {
            document.getElementById("playBtn").addEventListener("click", () => {
                userRequestedPlay = true;
                hideAllOverlays();
                if (isStreamReady && hls) {
                    video.play().catch(e => {
                        console.warn("Error al reproducir:", e);
                        showPlayOverlay();
                    });
                } else {
                    showLoading();
                }
            });
        }

        video.addEventListener("play", () => {
            hideAllOverlays();
            // Al comenzar a reproducir, ocultar poster si existe
            video.removeAttribute('poster');
        });
        video.addEventListener("pause", () => {
            if (enVivo && !video.ended && !video.seeking) {
                showPlayOverlay();
            }
        });

        video.addEventListener("loadedmetadata", () => {
            video.classList.toggle("video-vertical",   video.videoHeight > video.videoWidth);
            video.classList.toggle("video-horizontal", video.videoHeight <= video.videoWidth);
        });

        window.addEventListener("beforeunload", () => { if (hls) hls.destroy(); });
    }

    // ══════════════════════════════════════
    // CHAT (sin cambios)
    // ══════════════════════════════════════
    const chatMessages = document.getElementById("chatMessages");
    const chatInput    = document.getElementById("chatInput");
    const chatSendBtn  = document.getElementById("chatSendBtn");
    const modalNombre  = document.getElementById("modalNombre");
    const inputNombre  = document.getElementById("nombreUsuarioInput");
    const btnGuardar   = document.getElementById("guardarNombreBtn");

    if (chatMessages && chatInput && chatSendBtn) {
        const enVivo = document.getElementById("streamContainer")?.dataset.onAir === "true";

        if (enVivo) {
            chatMessages.innerHTML = "";
            chatInput.disabled   = false;
            chatSendBtn.disabled = false;

            function enviarMensaje() {
                const nombre = localStorage.getItem("nombre_chat");
                if (!nombre) {
                    if (modalNombre) {
                        modalNombre.classList.remove("oculto");
                        const guardar = () => {
                            const n = inputNombre?.value.trim();
                            if (n) {
                                localStorage.setItem("nombre_chat", n);
                                modalNombre.classList.add("oculto");
                                enviarMensaje();
                            }
                        };
                        if (btnGuardar) btnGuardar.onclick = guardar;
                        inputNombre?.addEventListener("keydown", e => { if (e.key === "Enter") guardar(); }, { once: true });
                    }
                    return;
                }
                const msg = chatInput.value.trim();
                if (!msg) return;
                fetch("/chat/enviar/", {
                    method: "POST",
                    headers: { "X-CSRFToken": getCookie("csrftoken") },
                    body: new URLSearchParams({ usuario: nombre, mensaje: msg }),
                })
                .then(r => r.json())
                .then(d => { d.activo ? renderMensajes(d.mensajes) : desactivarChat(); })
                .catch(() => {});
                chatInput.value = "";
            }

            chatSendBtn.addEventListener("click", enviarMensaje);
            chatInput.addEventListener("keydown", e => { if (e.key === "Enter") enviarMensaje(); });

            const poll = setInterval(() => {
                fetch("/chat/obtener/").then(r => r.json()).then(d => {
                    if (!d.activo) { desactivarChat(); clearInterval(poll); }
                    else renderMensajes(d.mensajes);
                }).catch(() => {});
            }, 2000);

        } else {
            desactivarChat();
        }

        function desactivarChat() {
            chatMessages.innerHTML = '<div class="chat-msg system">📴 El chat está desactivado</div>';
            if (chatInput)   chatInput.disabled   = true;
            if (chatSendBtn) chatSendBtn.disabled = true;
            localStorage.removeItem("nombre_chat");
        }

        function renderMensajes(msgs) {
            chatMessages.innerHTML = "";
            msgs.forEach(m => {
                const el = document.createElement("div");
                el.classList.add("chat-msg", "user");
                el.textContent = m;
                chatMessages.appendChild(el);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // ── Header shadow ──
    const header = document.getElementById("siteHeader");
    if (header) {
        window.addEventListener("scroll", () => {
            header.style.boxShadow = window.scrollY > 10 ? "0 2px 24px rgba(0,0,0,.45)" : "";
        }, { passive: true });
    }
});

// ==================== HELPERS ====================
function hexToRgba(hex, a) {
    try { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; }
    catch { return `rgba(0,0,0,${a})`; }
}
function adjustBrightness(hex, amt) {
    try {
        const c=n=>Math.min(255,Math.max(0,n));
        const r=c(parseInt(hex.slice(1,3),16)+amt), g=c(parseInt(hex.slice(3,5),16)+amt), b=c(parseInt(hex.slice(5,7),16)+amt);
        return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
    } catch { return hex; }
}
function loadGoogleFont(name) {
    const id=`gf-${name.replace(/\s/g,"-")}`;
    if (document.getElementById(id)) return;
    const l=document.createElement("link"); l.id=id; l.rel="stylesheet";
    l.href=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;600;700&display=swap`;
    document.head.appendChild(l);
}
function getCookie(name) {
    let v=null;
    document.cookie.split(";").forEach(c=>{ c=c.trim(); if(c.startsWith(name+"=")) v=decodeURIComponent(c.slice(name.length+1)); });
    return v;
}

// ==================== POSTMESSAGE PARA EDITOR (mantener) ====================
window.addEventListener("message", event => {
    const { type, payload } = event.data || {};
    if (!type) return;
    switch(type) {
        case "INIT_CONFIG":    applyFullConfig(payload); break;
        case "UPDATE_FIELD":   applyField(payload.key, payload.value); break;
        case "ADD_SECTION":    addSectionToDOM(payload.section); break;
        case "REMOVE_SECTION": document.getElementById(`sec-${payload.secId}`)?.remove(); break;
        case "UPDATE_SECTION": updateSectionInDOM(payload.secId, payload.field, payload.value); break;
        case "ADD_CARD":       addCardToDOM(payload.secId, payload.card, payload.idx); break;
        case "REMOVE_CARD":    removeCardFromDOM(payload.secId, payload.cardIdx); break;
        case "UPDATE_CARD":    updateCardInDOM(payload.secId, payload.cardIdx, payload.field, payload.value); break;
    }
});

function applyFullConfig(cfg) {
    if (!cfg) return;
    if (cfg.template) document.documentElement.setAttribute("data-template", cfg.template);
    const textKeys = [
        "org_name","org_slogan","hero_eyebrow","hero_title","hero_subtitle","hero_btn_text",
        "about_eyebrow","about_title","about_text","live_title","live_subtitle",
        "stat1_number","stat1_label","stat2_number","stat2_label","stat3_number","stat3_label",
        "contact_title","contact_subtitle","contact_address","contact_email","contact_phone",
    ];
    textKeys.forEach(k => { if (cfg[k] !== undefined) applyField(k, cfg[k]); });
    ["color_bg_primary","color_accent","color_text","font_display","font_body",
     "logo_url","hero_bg_url","about_img_url"].forEach(k => {
        if (cfg[k] !== undefined) applyField(k, cfg[k]);
    });
    if (Array.isArray(cfg.dynamic_sections)) {
        document.querySelectorAll(".dynamic-section").forEach(el => el.remove());
        cfg.dynamic_sections.forEach(sec => addSectionToDOM(sec));
    }
}

function applyField(key, value) {
    if (key === 'org_name') document.title = value;

    const textMap = {
        org_name:         ["#headerOrgName", ".footer-org-name"],
        org_slogan:       ["#headerOrgSlogan", ".footer-slogan"],
        hero_eyebrow:     ["[data-editable='hero_eyebrow']"],
        hero_title:       ["[data-editable='hero_title']"],
        hero_subtitle:    ["[data-editable='hero_subtitle']"],
        hero_btn_text:    ["[data-editable='hero_btn_text']"],
        about_eyebrow:    ["[data-editable='about_eyebrow']"],
        about_title:      ["[data-editable='about_title']", ".about-title"],
        about_text:       ["[data-editable='about_text']",  ".about-text"],
        stat1_number:     ["[data-editable='stat1_number']"],
        stat1_label:      ["[data-editable='stat1_label']"],
        stat2_number:     ["[data-editable='stat2_number']"],
        stat2_label:      ["[data-editable='stat2_label']"],
        stat3_number:     ["[data-editable='stat3_number']"],
        stat3_label:      ["[data-editable='stat3_label']"],
        live_title:       ["[data-editable='live_title']"],
        live_subtitle:    ["[data-editable='live_subtitle']"],
        contact_title:    ["[data-editable='contact_title']"],
        contact_subtitle: ["[data-editable='contact_subtitle']"],
        contact_address:  ["[data-editable='contact_address']"],
        contact_email:    ["[data-editable='contact_email']"],
        contact_phone:    ["[data-editable='contact_phone']"],
    };

    if (key === "logo_url") {
        document.querySelectorAll("img.kc-logo-img").forEach(img => { img.src = value || ""; });
        return;
    }
    if (key === "hero_bg_url") {
        let bg = document.querySelector(".kc-hero-photo");
        if (value) {
            if (!bg) { bg = document.createElement("div"); bg.className = "kc-hero-photo"; document.querySelector(".kc-hero")?.prepend(bg); }
            bg.style.backgroundImage = `url('${value}')`;
            bg.style.display = "block";
        } else if (bg) { bg.style.display = "none"; }
        return;
    }
    if (key === "about_img_url") {
        const wrap = document.querySelector(".about-image-wrap, .kc-about-img");
        if (!wrap) return;
        if (value) {
            let img = wrap.querySelector(".about-img");
            if (!img) { wrap.innerHTML = `<img src="${value}" alt="Sobre nosotros" class="about-img">`; }
            else { img.src = value; wrap.querySelector(".kc-img-empty")?.remove(); }
        } else {
            wrap.innerHTML = `<div class="kc-img-empty"><div class="kc-crosshair"></div><span class="material-symbols-outlined">groups</span><span>Tu organización</span></div>`;
        }
        return;
    }
    if (key === "color_bg_primary") {
        document.documentElement.style.setProperty("--bg",   value);
        document.documentElement.style.setProperty("--bg2",  adjustBrightness(value,  8));
        document.documentElement.style.setProperty("--bg3",  adjustBrightness(value, 16));
        document.documentElement.style.setProperty("--card", adjustBrightness(value,  6));
        return;
    }
    if (key === "color_accent") {
        document.documentElement.style.setProperty("--accent",      value);
        document.documentElement.style.setProperty("--accent2",     adjustBrightness(value, 20));
        document.documentElement.style.setProperty("--accent-glow", hexToRgba(value, 0.15));
        return;
    }
    if (key === "color_text") {
        document.documentElement.style.setProperty("--text",       value);
        document.documentElement.style.setProperty("--text-muted", hexToRgba(value, 0.5));
        return;
    }
    if (key === "font_display") {
        document.documentElement.style.setProperty("--font-display", `'${value}', Georgia, serif`);
        loadGoogleFont(value); return;
    }
    if (key === "font_body") {
        document.documentElement.style.setProperty("--font-body", `'${value}', system-ui, sans-serif`);
        loadGoogleFont(value); return;
    }

    const sels = textMap[key];
    if (sels) sels.forEach(sel => document.querySelectorAll(sel).forEach(el => { el.textContent = value; }));
}

function addSectionToDOM(sec) {
    if (document.getElementById(`sec-${sec.id}`)) return;
    const el = document.createElement("section");
    el.classList.add("dynamic-section", `type-${sec.type || "cards"}`);
    if (sec.type === "split" && sec.img_side === "left") el.classList.add("img-left");
    el.id = `sec-${sec.id}`;
    el.dataset.dynamicId = sec.id;
    el.innerHTML = buildSectionHTML(sec);
    const anchors = {
        before_player:  "[data-section='stream']",
        after_player:   "[data-section='stream']",
        before_contact: "[data-section='contact']",
    };
    const anchor = document.querySelector(anchors[sec.position] || anchors.before_contact);
    if (anchor) {
        if (sec.position === "after_player") anchor.after(el);
        else anchor.before(el);
    } else {
        (document.querySelector(".site-content") || document.body).appendChild(el);
    }
}

function buildSectionHTML(sec) {
    const t = sec.type || "cards";
    if (t === "cards") {
        const cards = (sec.cards||[]).map((c,i) =>
            `<div class="ds-card" data-card-id="${i}">
                <span class="material-symbols-outlined ds-card-icon">${c.icon||"star"}</span>
                <h3 class="ds-card-title">${c.title||""}</h3>
                <p class="ds-card-text">${c.text||""}</p>
            </div>`).join("");
        return `<div class="ds-inner">
            <div class="ds-header">
                ${sec.nav_label?`<span class="ds-eyebrow">${sec.nav_label}</span>`:""}
                <h2 class="ds-title">${sec.title||""}</h2>
                ${sec.subtitle?`<p class="ds-subtitle">${sec.subtitle}</p>`:""}
            </div>
            <div class="ds-cards-grid">${cards}</div></div>`;
    }
    if (t === "banner") {
        return `${sec.img_url?`<div class="ds-banner-bg" style="background-image:url('${sec.img_url}')"></div>`:""}
        <div class="ds-inner"><div class="ds-banner-content">
            <h2 class="ds-title">${sec.title||""}</h2>
            ${sec.subtitle?`<p class="ds-subtitle">${sec.subtitle}</p>`:""}
            ${sec.btn_text?`<a href="${sec.btn_url||"#"}" class="ds-banner-btn">${sec.btn_text}</a>`:""}
        </div></div>`;
    }
    if (t === "split") {
        const img = sec.img_url
            ? `<img src="${sec.img_url}" alt="${sec.title||""}">`
            : `<div class="ds-img-placeholder"><span class="material-symbols-outlined">image</span><span>Imagen</span></div>`;
        return `<div class="ds-inner">
            <div class="ds-split-content">
                <h2 class="ds-title">${sec.title||""}</h2>
                ${sec.subtitle?`<p class="ds-subtitle">${sec.subtitle}</p>`:""}
                ${sec.btn_text?`<a href="${sec.btn_url||"#"}" class="ds-split-btn">${sec.btn_text}</a>`:""}
            </div>
            <div class="ds-split-image">${img}</div></div>`;
    }
    return "";
}

function updateSectionInDOM(secId, field, value) {
    const sec = document.getElementById(`sec-${secId}`);
    if (!sec) return;
    const m = { title:".ds-title", subtitle:".ds-subtitle", nav_label:".ds-eyebrow", btn_text:".ds-banner-btn,.ds-split-btn" };
    if (field==="img_url") {
        const bg=sec.querySelector(".ds-banner-bg"), wrap=sec.querySelector(".ds-split-image");
        if (bg) bg.style.backgroundImage = value?`url('${value}')`:"none";
        if (wrap) wrap.innerHTML = value?`<img src="${value}" alt="">`:
            `<div class="ds-img-placeholder"><span class="material-symbols-outlined">image</span><span>Imagen</span></div>`;
        return;
    }
    if (field==="img_side") { sec.classList.toggle("img-left", value==="left"); return; }
    if (field==="btn_url")  { sec.querySelectorAll(".ds-banner-btn,.ds-split-btn").forEach(el=>el.href=value||"#"); return; }
    if (m[field]) sec.querySelectorAll(m[field]).forEach(el=>{ el.textContent=value; el.style.display=value?"":"none"; });
}

function addCardToDOM(secId, card, idx) {
    const grid = document.querySelector(`#sec-${secId} .ds-cards-grid`);
    if (!grid) return;
    const el = document.createElement("div");
    el.classList.add("ds-card"); el.dataset.cardId = idx;
    el.innerHTML = `<span class="material-symbols-outlined ds-card-icon">${card.icon||"star"}</span>
        <h3 class="ds-card-title">${card.title||""}</h3><p class="ds-card-text">${card.text||""}</p>`;
    grid.appendChild(el);
}
function removeCardFromDOM(secId, idx) {
    document.querySelector(`#sec-${secId} [data-card-id="${idx}"]`)?.remove();
    document.querySelectorAll(`#sec-${secId} [data-card-id]`).forEach((c,i)=>c.dataset.cardId=i);
}
function updateCardInDOM(secId, idx, field, value) {
    const card = document.querySelector(`#sec-${secId} [data-card-id="${idx}"]`);
    if (!card) return;
    const m = { title:".ds-card-title", text:".ds-card-text", icon:".ds-card-icon" };
    if (m[field]) { const el=card.querySelector(m[field]); if(el) el.textContent=value; }
}