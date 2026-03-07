/* ═══════════════════════════════════════════════════════
   KAIRCAM.JS — Template logic + Editor postMessage listener
═══════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {

    // ── Mobile nav ──
    const toggle = document.getElementById("navToggle");
    const nav    = document.getElementById("siteNav");
    if (toggle && nav) {
        toggle.addEventListener("click", () => nav.classList.toggle("open"));
        nav.querySelectorAll(".kc-nav-a").forEach(a =>
            a.addEventListener("click", () => nav.classList.remove("open"))
        );
    }

    // ── Header shadow on scroll ──
    const header = document.getElementById("siteHeader");
    if (header) {
        window.addEventListener("scroll", () => {
            header.style.boxShadow = window.scrollY > 20
                ? "0 4px 32px rgba(0,0,0,.55)" : "";
        }, { passive: true });
    }

    // ── Smooth scroll ──
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener("click", e => {
            const t = document.querySelector(a.getAttribute("href"));
            if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
        });
    });

    // ── Reveal on scroll ──
    if ("IntersectionObserver" in window) {
        const items = document.querySelectorAll(
            ".kc-stat, .kc-contact-card, .kc-about-body, .ds-card, .dynamic-section, .kc-event-card"
        );
        const obs = new IntersectionObserver(entries => {
            entries.forEach((e, i) => {
                if (e.isIntersecting) {
                    e.target.style.animation = `fadeUp 0.45s ease ${i * 0.05}s forwards`;
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.12 });
        items.forEach(el => { el.style.opacity = "0"; obs.observe(el); });
    }

    // ══════════════════════════════════════════════════════
    // EDITOR — postMessage listener
    // Escucha mensajes del editor (iframe parent) y aplica
    // los cambios en tiempo real sin recargar la página
    // ══════════════════════════════════════════════════════
    window.addEventListener("message", (e) => {
        const { type, payload } = e.data || {};
        if (!type) return;

        switch (type) {

            // ── Inicialización completa — aplica todo el config ──
            case "INIT_CONFIG": {
                const cfg = payload;
                if (!cfg) return;

                // Campos de texto simples con data-editable
                Object.entries(cfg).forEach(([key, val]) => {
                    if (typeof val === "string" || typeof val === "number") {
                        applyField(key, val);
                    }
                });

                // CSS variables (colores + fuentes)
                applyCssVars(cfg);

                // Logo
                if (cfg.logo_url) applyLogo(cfg.logo_url);

                // Secciones dinámicas en nav
                if (Array.isArray(cfg.dynamic_sections)) applyDynNav(cfg.dynamic_sections);

                // Hero bg
                if (cfg.hero_bg_url !== undefined) applyHeroBg(cfg.hero_bg_url);

                // About img
                if (cfg.about_img_url !== undefined) applyAboutImg(cfg.about_img_url);

                break;
            }

            // ── Un campo individual cambió ──
            case "UPDATE_FIELD": {
                const { key, value } = payload;
                if (!key) return;

                applyField(key, value);

                // Casos especiales
                if (key === "logo_url")        applyLogo(value);
                if (key === "hero_bg_url")     applyHeroBg(value);
                if (key === "about_img_url")   applyAboutImg(value);
                if (key.startsWith("color_") || key.startsWith("font_")) {
                    applyCssVarsFromField(key, value);
                }
                if (key === "events")          applyEvents(value);
                if (key === "ads")             applyAds(value);
                if (key === "footer_links")    applyFooterLinks(value);
                if (key === "footer_copyright") applyFooterCopyright(value);
                if (key === "footer_tagline")  applyFooterTagline(value);
                if (key === "org_name")        applyOrgName(value);
                if (key === "org_slogan")      applyOrgSlogan(value);

                break;
            }

            // ── Sección dinámica agregada ──
            case "ADD_SECTION": {
                // Recargar el iframe es más confiable para secciones complejas
                // pero podemos al menos agregar al nav inmediatamente
                const sec = payload.section;
                if (sec) addNavLink(sec);
                break;
            }

            // ── Sección dinámica eliminada ──
            case "REMOVE_SECTION": {
                const link = document.querySelector(`a[href="#sec-${payload.secId}"]`);
                if (link) link.remove();
                const secEl = document.getElementById(`sec-${payload.secId}`);
                if (secEl) secEl.remove();
                break;
            }

            // ── Campo de sección dinámica actualizado ──
            case "UPDATE_SECTION": {
                const { secId, field, value } = payload;
                const secEl = document.getElementById(`sec-${secId}`);
                if (!secEl) return;
                const el = secEl.querySelector(`[data-sec-field="${field}"]`);
                if (el) el.textContent = value;
                break;
            }
        }
    });

    // ══════════════════════════════════════════════════════
    // FUNCIONES DE APLICACIÓN
    // ══════════════════════════════════════════════════════

    function applyField(key, value) {
        // Actualiza todos los elementos con data-editable="key"
        document.querySelectorAll(`[data-editable="${key}"]`).forEach(el => {
            el.textContent = value;
        });
    }

    function applyCssVars(cfg) {
        const style = document.getElementById("siteThemeVars") || document.createElement("style");
        style.id = "siteThemeVars";
        let css = ":root {";
        if (cfg.color_bg_primary) css += `--bg:${cfg.color_bg_primary};--bg2:${cfg.color_bg_primary};--bg3:${cfg.color_bg_primary};--card:${cfg.color_bg_primary};`;
        if (cfg.color_accent)     css += `--accent:${cfg.color_accent};--accent2:${cfg.color_accent};--accent-glow:${cfg.color_accent}2e;`;
        if (cfg.color_text)       css += `--text:${cfg.color_text};--text-muted:${cfg.color_text};`;
        if (cfg.font_display)     css += `--font-display:'${cfg.font_display}',Georgia,serif;`;
        if (cfg.font_body)        css += `--font-body:'${cfg.font_body}',system-ui,sans-serif;`;
        css += "}";
        style.textContent = css;
        if (!style.parentNode) document.head.appendChild(style);
    }

    function applyCssVarsFromField(key, value) {
        const map = {
            color_bg_primary: ["--bg","--bg2","--bg3","--card"],
            color_accent:     ["--accent","--accent2"],
            color_text:       ["--text","--text-muted"],
        };
        const root = document.documentElement;
        if (map[key]) {
            map[key].forEach(v => root.style.setProperty(v, value));
            if (key === "color_accent") root.style.setProperty("--accent-glow", value + "2e");
        }
        if (key === "font_display") root.style.setProperty("--font-display", `'${value}',Georgia,serif`);
        if (key === "font_body")    root.style.setProperty("--font-body",    `'${value}',system-ui,sans-serif`);
    }

    function applyLogo(url) {
        document.querySelectorAll("#headerLogo, .kc-logo-img").forEach(el => {
            if (el.tagName === "IMG") {
                el.src = url;
            } else {
                // Reemplazar el div-logo por una img
                const img = document.createElement("img");
                img.src = url; img.alt = "Logo"; img.className = "kc-logo-img";
                if (el.id) img.id = el.id;
                el.replaceWith(img);
            }
        });
    }

    function applyHeroBg(url) {
        let photoBg = document.querySelector(".kc-hero-photo");
        if (url) {
            if (!photoBg) {
                photoBg = document.createElement("div");
                photoBg.className = "kc-hero-photo";
                document.querySelector(".kc-hero")?.prepend(photoBg);
            }
            photoBg.style.backgroundImage = `url('${url}')`;
        } else {
            if (photoBg) photoBg.remove();
        }
    }

    function applyAboutImg(url) {
        const wrap = document.querySelector(".about-image-wrap");
        if (!wrap) return;
        if (url) {
            let img = wrap.querySelector(".about-img");
            if (!img) {
                wrap.innerHTML = `<img src="${url}" alt="Sobre nosotros" class="about-img" style="width:100%;height:100%;object-fit:cover">`;
            } else {
                img.src = url;
            }
        }
    }

    function applyDynNav(sections) {
        // Limpiar links dinámicos existentes en el nav
        document.querySelectorAll(".kc-nav-a[data-dyn]").forEach(a => a.remove());
        const nav = document.getElementById("siteNav");
        const contactLink = nav?.querySelector('a[href="#contacto"]');
        sections.forEach(sec => {
            const a = document.createElement("a");
            a.href = `#sec-${sec.id}`;
            a.className = "kc-nav-a";
            a.dataset.dyn = sec.id;
            a.textContent = sec.nav_label || sec.title;
            if (contactLink) nav.insertBefore(a, contactLink);
            else nav?.appendChild(a);
        });
    }

    function addNavLink(sec) {
        const nav = document.getElementById("siteNav");
        const contactLink = nav?.querySelector('a[href="#contacto"]');
        const existing = nav?.querySelector(`a[href="#sec-${sec.id}"]`);
        if (existing) return;
        const a = document.createElement("a");
        a.href = `#sec-${sec.id}`;
        a.className = "kc-nav-a";
        a.dataset.dyn = sec.id;
        a.textContent = sec.nav_label || sec.title;
        if (contactLink) nav.insertBefore(a, contactLink);
        else nav?.appendChild(a);
    }

    function applyOrgName(value) {
        document.querySelectorAll(".footer-org-name, #headerOrgName, .kc-brand-name").forEach(el => {
            el.textContent = value;
        });
        document.title = value;
    }

    function applyOrgSlogan(value) {
        document.querySelectorAll(".footer-slogan, #headerOrgSlogan, .kc-brand-tag").forEach(el => {
            el.textContent = value;
        });
    }

    function applyFooterCopyright(value) {
        const el = document.querySelector(".kc-footer-bottom p");
        if (el && value) el.textContent = value;
    }

    function applyFooterTagline(value) {
        const el = document.querySelector(".kc-footer-slogan");
        if (el && value) el.textContent = value;
    }

    function applyFooterLinks(links) {
        // Eliminar links dinámicos del footer previos
        document.querySelectorAll(".kc-footer-nav a[data-footer-link]").forEach(a => a.remove());
        const footerNav = document.querySelector(".kc-footer-nav");
        if (!footerNav || !Array.isArray(links)) return;
        links.forEach(lnk => {
            if (!lnk.label || !lnk.url) return;
            const a = document.createElement("a");
            a.href = lnk.url; a.target = "_blank";
            a.textContent = lnk.label;
            a.dataset.footerLink = "1";
            footerNav.appendChild(a);
        });
    }

    function applyEvents(events) {
        // Si ya existe la sección de eventos, actualizar su contenido
        let section = document.getElementById("eventos");

        if (!Array.isArray(events) || events.length === 0) {
            if (section) section.remove();
            return;
        }

        if (!section) {
            // Crear la sección antes de #contacto
            section = document.createElement("section");
            section.className = "kc-events";
            section.id = "eventos";
            const contactSection = document.getElementById("contacto");
            if (contactSection) contactSection.parentNode.insertBefore(section, contactSection);
            else document.querySelector(".site-content")?.appendChild(section);
        }

        section.innerHTML = `
            <div class="kc-wrap">
                <div class="kc-sec-head">
                    <h2 class="kc-h2">Próximos Eventos</h2>
                    <p class="kc-sec-sub">No te pierdas lo que viene</p>
                </div>
                <div class="kc-events-grid">
                    ${events.map(ev => {
                        const dateObj = ev.date ? new Date(ev.date + "T12:00:00") : null;
                        const day   = dateObj ? dateObj.getDate() : "";
                        const month = dateObj ? dateObj.toLocaleString("es-AR", { month: "short" }) : "";
                        return `
                        <div class="kc-event-card">
                            ${ev.img_url ? `<div class="kc-event-img" style="background-image:url('${ev.img_url}')"></div>` : ""}
                            <div class="kc-event-body">
                                ${ev.date ? `
                                <div class="kc-event-date-badge">
                                    <span class="kc-event-day">${day}</span>
                                    <span class="kc-event-month">${month}</span>
                                </div>` : ""}
                                <div class="kc-event-info">
                                    <h3 class="kc-event-title">${escHtml(ev.name || "")}</h3>
                                    ${ev.desc ? `<p class="kc-event-desc">${escHtml(ev.desc)}</p>` : ""}
                                    <div class="kc-event-meta">
                                        ${ev.time  ? `<span><span class="material-symbols-outlined">schedule</span>${ev.time}</span>` : ""}
                                        ${ev.place ? `<span><span class="material-symbols-outlined">location_on</span>${escHtml(ev.place)}</span>` : ""}
                                    </div>
                                    ${ev.has_btn && ev.btn_url ? `<a href="${ev.btn_url}" class="kc-btn kc-red" target="_blank">${escHtml(ev.btn_text || "Inscribirse")}</a>` : ""}
                                </div>
                            </div>
                        </div>`;
                    }).join("")}
                </div>
            </div>`;

        // Agregar link "Eventos" al nav si no existe
        const nav = document.getElementById("siteNav");
        if (nav && !nav.querySelector('a[href="#eventos"]')) {
            const contactLink = nav.querySelector('a[href="#contacto"]');
            const a = document.createElement("a");
            a.href = "#eventos"; a.className = "kc-nav-a"; a.textContent = "Eventos";
            if (contactLink) nav.insertBefore(a, contactLink);
            else nav.appendChild(a);
        }
    }

    function applyAds(ads) {
        if (!Array.isArray(ads)) return;

        // Notices — eliminar previos y recrear
        document.querySelectorAll(".kc-notice-bar[data-dynamic]").forEach(el => el.remove());
        ads.filter(a => a.type === "notice").forEach(ad => {
            const bar = document.createElement("div");
            bar.className = "kc-notice-bar";
            bar.dataset.dynamic = "1";
            bar.style.background = ad.bg_color || "#c9a84c";
            bar.innerHTML = `
                <div class="kc-wrap kc-notice-inner">
                    <span class="material-symbols-outlined">campaign</span>
                    <span class="kc-notice-text">${escHtml(ad.title)}${ad.text ? " — " + escHtml(ad.text) : ""}</span>
                    <button class="kc-notice-close" onclick="this.closest('.kc-notice-bar').remove()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>`;
            const siteHeader = document.getElementById("siteHeader");
            if (siteHeader) siteHeader.after(bar);
        });

        // Banners
        let bannersSection = document.querySelector(".kc-banners-section[data-dynamic]");
        const banners = ads.filter(a => a.type === "banner");
        if (banners.length > 0) {
            if (!bannersSection) {
                bannersSection = document.createElement("section");
                bannersSection.className = "kc-banners-section";
                bannersSection.dataset.dynamic = "1";
                const aboutSection = document.getElementById("nosotros");
                if (aboutSection) aboutSection.after(bannersSection);
            }
            bannersSection.innerHTML = `<div class="kc-wrap">${banners.map(ad =>
                `<a href="${ad.url || '#'}" class="kc-ad-banner" target="_blank">
                    <img src="${ad.img_url}" alt="${escHtml(ad.alt || 'Publicidad')}">
                </a>`
            ).join("")}</div>`;
        } else {
            if (bannersSection) bannersSection.remove();
        }

        // Sponsors
        let sponsorsSection = document.querySelector(".kc-sponsors-section[data-dynamic]");
        const sponsors = ads.filter(a => a.type === "sponsor");
        if (sponsors.length > 0) {
            if (!sponsorsSection) {
                sponsorsSection = document.createElement("section");
                sponsorsSection.className = "kc-sponsors-section";
                sponsorsSection.dataset.dynamic = "1";
                const aboutSection = document.getElementById("nosotros");
                if (aboutSection) aboutSection.after(sponsorsSection);
            }
            sponsorsSection.innerHTML = `
                <div class="kc-wrap">
                    <p class="kc-sponsors-label">Con el apoyo de</p>
                    <div class="kc-sponsors-grid">
                        ${sponsors.map(ad => `
                        <a href="${ad.url || '#'}" class="kc-sponsor-item" target="_blank" title="${escHtml(ad.name || '')}">
                            ${ad.logo_url
                                ? `<img src="${ad.logo_url}" alt="${escHtml(ad.name || '')}">`
                                : `<span class="kc-sponsor-name">${escHtml(ad.name || "")}</span>`}
                        </a>`).join("")}
                    </div>
                </div>`;
        } else {
            if (sponsorsSection) sponsorsSection.remove();
        }
    }

    function escHtml(s) {
        return String(s || "")
            .replace(/&/g,"&amp;").replace(/</g,"&lt;")
            .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }

}); // fin DOMContentLoaded