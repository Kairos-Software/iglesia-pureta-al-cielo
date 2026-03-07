/* ═══════════════════════════════════════════════════════════
   MODERNO.JS v2
═══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {

    // ── Nav scroll ──
    const nav = document.getElementById("mnNav");
    if (nav) window.addEventListener("scroll", () =>
        nav.classList.toggle("scrolled", window.scrollY > 60), { passive: true });

    // ── Burger / Drawer (se abre desde la DERECHA) ──
    const burger = document.getElementById("mnBurger");
    const drawer = document.getElementById("mnDrawer");
    const bg     = document.getElementById("mnDrawerBg");
    const open  = () => { drawer?.classList.add("open"); bg?.classList.add("open"); };
    const close = () => { drawer?.classList.remove("open"); bg?.classList.remove("open"); };
    burger?.addEventListener("click", () => drawer?.classList.contains("open") ? close() : open());
    bg?.addEventListener("click", close);
    drawer?.querySelectorAll(".mn-drawer-a").forEach(a => a.addEventListener("click", close));

    // ── Smooth scroll ──
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener("click", e => {
            const t = document.querySelector(a.getAttribute("href"));
            if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
        });
    });

    // ── Reveal on scroll ──
    if ("IntersectionObserver" in window) {
        const items = document.querySelectorAll(".mn-hstat, .mn-astat, .mn-contact-item, .ds-card, .mn-event, .mn-about-text-col");
        const obs = new IntersectionObserver(entries => {
            entries.forEach((e, i) => {
                if (e.isIntersecting) {
                    e.target.style.animation = `fadeUp 0.5s ease ${i * 0.07}s forwards`;
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
        items.forEach(el => { el.style.opacity = "0"; obs.observe(el); });
    }

    // ══════════════════════════════════════════════════════
    // EDITOR — postMessage
    // ══════════════════════════════════════════════════════
    window.addEventListener("message", ({ data }) => {
        const { type, payload } = data || {};
        if (!type) return;

        switch (type) {
            case "INIT_CONFIG": {
                const cfg = payload; if (!cfg) return;
                Object.entries(cfg).forEach(([k, v]) => {
                    if (typeof v === "string" || typeof v === "number") applyField(k, v);
                });
                applyCssVars(cfg);
                if (cfg.logo_url) applyLogo(cfg.logo_url);
                if (cfg.hero_bg_url !== undefined) applyHeroBg(cfg.hero_bg_url);
                if (cfg.about_img_url !== undefined) applyAboutImg(cfg.about_img_url);
                if (Array.isArray(cfg.dynamic_sections)) applyDynNav(cfg.dynamic_sections);
                break;
            }
            case "UPDATE_FIELD": {
                const { key, value } = payload; if (!key) return;
                applyField(key, value);
                if (key === "logo_url")       applyLogo(value);
                if (key === "hero_bg_url")    applyHeroBg(value);
                if (key === "about_img_url")  applyAboutImg(value);
                if (key.startsWith("color_") || key.startsWith("font_")) applyCssVarsFromField(key, value);
                if (key === "events")         applyEvents(value);
                if (key === "ads")            applyAds(value);
                if (key === "footer_links")   applyFooterLinks(value);
                if (key === "footer_copyright") { const el = document.querySelector(".mn-footer-bottom p"); if (el && value) el.textContent = value; }
                if (key === "footer_tagline") { document.querySelectorAll(".mn-footer-tag").forEach(el => el.textContent = value); }
                if (key === "org_name")       { document.querySelectorAll(".footer-org-name").forEach(el => el.textContent = value); document.title = value; }
                if (key === "org_slogan")     { document.querySelectorAll(".footer-slogan").forEach(el => el.textContent = value); }
                break;
            }
            case "ADD_SECTION":    addNavLink(payload.section); break;
            case "REMOVE_SECTION": {
                document.querySelector(`a[href="#sec-${payload.secId}"]`)?.remove();
                document.getElementById(`sec-${payload.secId}`)?.remove();
                break;
            }
            case "UPDATE_SECTION": {
                const el = document.getElementById(`sec-${payload.secId}`)?.querySelector(`[data-sec-field="${payload.field}"]`);
                if (el) el.textContent = payload.value;
                break;
            }
        }
    });

    function applyField(key, value) {
        document.querySelectorAll(`[data-editable="${key}"]`).forEach(el => el.textContent = value);
    }

    function applyCssVars(cfg) {
        let s = document.getElementById("siteThemeVars");
        if (!s) { s = document.createElement("style"); s.id = "siteThemeVars"; document.head.appendChild(s); }
        let css = ":root {";
        if (cfg.color_bg_primary) css += `--bg:${cfg.color_bg_primary};--bg2:${cfg.color_bg_primary};--bg3:${cfg.color_bg_primary};--card:${cfg.color_bg_primary};`;
        if (cfg.color_accent)     css += `--accent:${cfg.color_accent};--accent2:${cfg.color_accent};--accent-glow:${cfg.color_accent}22;`;
        if (cfg.color_text)       css += `--text:${cfg.color_text};--text-muted:${cfg.color_text};`;
        if (cfg.font_display)     css += `--font-display:'${cfg.font_display}',Georgia,serif;`;
        if (cfg.font_body)        css += `--font-body:'${cfg.font_body}',system-ui,sans-serif;`;
        css += "}"; s.textContent = css;
    }

    function applyCssVarsFromField(key, value) {
        const root = document.documentElement;
        const map = { color_bg_primary: ["--bg","--bg2","--bg3","--card"], color_accent: ["--accent","--accent2"], color_text: ["--text","--text-muted"] };
        if (map[key]) { map[key].forEach(v => root.style.setProperty(v, value)); if (key === "color_accent") root.style.setProperty("--accent-glow", value + "22"); }
        if (key === "font_display") root.style.setProperty("--font-display", `'${value}',Georgia,serif`);
        if (key === "font_body")    root.style.setProperty("--font-body",    `'${value}',system-ui,sans-serif`);
    }

    function applyLogo(url) {
        document.querySelectorAll("#mnNavLogo, .mn-footer-logo, .mn-nav-logo").forEach(el => { if (el.tagName === "IMG") el.src = url; });
    }

    function applyHeroBg(url) {
        let bg = document.querySelector(".mn-hero-bg");
        if (url) {
            if (!bg) { bg = document.createElement("div"); bg.className = "mn-hero-bg"; document.querySelector(".mn-hero")?.prepend(bg); }
            bg.style.backgroundImage = `url('${url}')`;
        } else bg?.remove();
    }

    function applyAboutImg(url) {
        const wrap = document.querySelector(".about-image-wrap");
        if (!wrap || !url) return;
        let img = wrap.querySelector(".about-img");
        if (!img) { wrap.innerHTML = `<img src="${url}" alt="Nosotros" class="mn-about-img about-img">`; }
        else img.src = url;
    }

    function applyDynNav(sections) {
        document.querySelectorAll(".mn-nav-links a[data-dyn], .mn-drawer-a[data-dyn]").forEach(a => a.remove());
        const navLinks = document.getElementById("mnNavLinks");
        const drawer   = document.getElementById("mnDrawer");
        const navContact  = navLinks?.querySelector('a[href="#contacto"]');
        const drawContact = drawer?.querySelector('a[href="#contacto"]');
        sections.forEach(sec => {
            [{ parent: navLinks, contact: navContact, cls: "" },
             { parent: drawer,   contact: drawContact, cls: " mn-drawer-a" }].forEach(({ parent, contact, cls }) => {
                if (!parent) return;
                const a = document.createElement("a");
                a.href = `#sec-${sec.id}`; a.dataset.dyn = sec.id;
                a.textContent = sec.nav_label || sec.title;
                if (cls) a.className = cls.trim();
                if (contact) parent.insertBefore(a, contact); else parent.appendChild(a);
            });
        });
    }

    function addNavLink(sec) {
        const navLinks = document.getElementById("mnNavLinks");
        if (navLinks && !navLinks.querySelector(`a[href="#sec-${sec.id}"]`)) {
            const contact = navLinks.querySelector('a[href="#contacto"]');
            const a = document.createElement("a"); a.href = `#sec-${sec.id}`; a.dataset.dyn = sec.id; a.textContent = sec.nav_label || sec.title;
            if (contact) navLinks.insertBefore(a, contact); else navLinks.appendChild(a);
        }
    }

    function applyFooterLinks(links) {
        document.querySelectorAll(".mn-footer-nav a[data-fl]").forEach(a => a.remove());
        const nav = document.querySelector(".mn-footer-nav");
        if (!nav || !Array.isArray(links)) return;
        links.forEach(lnk => {
            if (!lnk.label || !lnk.url) return;
            const a = document.createElement("a"); a.href = lnk.url; a.target = "_blank"; a.textContent = lnk.label; a.dataset.fl = "1"; nav.appendChild(a);
        });
    }

    function applyEvents(events) {
        let section = document.getElementById("eventos");
        if (!Array.isArray(events) || !events.length) { section?.remove(); return; }
        if (!section) {
            section = document.createElement("section"); section.className = "mn-events"; section.id = "eventos";
            document.getElementById("contacto")?.before(section);
        }
        section.innerHTML = `<div class="mn-wrap">
            <p class="mn-overline">Agenda</p>
            <h2 class="mn-section-title">Próximos Eventos</h2>
            <div class="mn-events-list">
                ${events.map(ev => {
                    const d = ev.date ? new Date(ev.date + "T12:00:00") : null;
                    return `<div class="mn-event">
                        ${ev.img_url ? `<div class="mn-event-img" style="background-image:url('${ev.img_url}')"></div>` : ""}
                        <div class="mn-event-date">
                            ${d ? `<span class="mn-event-day">${d.getDate()}</span><span class="mn-event-month">${d.toLocaleString("es-AR",{month:"short"}).toUpperCase()}</span>` : ""}
                        </div>
                        <div class="mn-event-body">
                            <h3 class="mn-event-title">${esc(ev.name||"")}</h3>
                            ${ev.desc ? `<p class="mn-event-desc">${esc(ev.desc)}</p>` : ""}
                            <div class="mn-event-meta">
                                ${ev.time  ? `<span><span class="material-symbols-outlined">schedule</span>${ev.time}</span>` : ""}
                                ${ev.place ? `<span><span class="material-symbols-outlined">location_on</span>${esc(ev.place)}</span>` : ""}
                            </div>
                            ${ev.has_btn && ev.btn_url ? `<a href="${ev.btn_url}" class="mn-event-btn" target="_blank">${esc(ev.btn_text||"Inscribirse")}</a>` : ""}
                        </div>
                    </div>`;
                }).join("")}
            </div>
        </div>`;
    }

    function applyAds(ads) {
        if (!Array.isArray(ads)) return;
        document.querySelectorAll(".mn-notice[data-dyn]").forEach(el => el.remove());
        ads.filter(a => a.type === "notice").forEach(ad => {
            const bar = document.createElement("div"); bar.className = "mn-notice"; bar.dataset.dyn = "1"; bar.style.background = ad.bg_color || "var(--mn-gold)";
            bar.innerHTML = `<div class="mn-notice-inner"><span class="material-symbols-outlined">campaign</span><span>${esc(ad.title)}${ad.text ? " — "+esc(ad.text) : ""}</span><button onclick="this.closest('.mn-notice').remove()"><span class="material-symbols-outlined">close</span></button></div>`;
            document.getElementById("mnNav")?.after(bar);
        });
        let bannersEl = document.querySelector(".mn-banners[data-dyn]");
        const banners = ads.filter(a => a.type === "banner");
        if (banners.length) {
            if (!bannersEl) { bannersEl = document.createElement("div"); bannersEl.className = "mn-banners"; bannersEl.dataset.dyn = "1"; document.getElementById("nosotros")?.after(bannersEl); }
            bannersEl.innerHTML = `<div class="mn-wrap">${banners.map(ad => `<a href="${ad.url||'#'}" class="mn-banner" target="_blank"><img src="${ad.img_url}" alt=""></a>`).join("")}</div>`;
        } else bannersEl?.remove();
        let sponsorsEl = document.querySelector(".mn-sponsors[data-dyn]");
        const sponsors = ads.filter(a => a.type === "sponsor");
        if (sponsors.length) {
            if (!sponsorsEl) { sponsorsEl = document.createElement("div"); sponsorsEl.className = "mn-sponsors"; sponsorsEl.dataset.dyn = "1"; document.getElementById("nosotros")?.after(sponsorsEl); }
            sponsorsEl.innerHTML = `<div class="mn-wrap"><p class="mn-sponsors-lbl">Con el apoyo de</p><div class="mn-sponsors-row">${sponsors.map(ad => `<a href="${ad.url||'#'}" class="mn-sponsor" target="_blank">${ad.logo_url ? `<img src="${ad.logo_url}" alt="">` : `<span>${esc(ad.name||"")}</span>`}</a>`).join("")}</div></div>`;
        } else sponsorsEl?.remove();
    }

    function esc(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

});