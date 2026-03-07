/* magazine.js */
document.addEventListener("DOMContentLoaded", () => {

    // Fecha en masthead
    const dateEl = document.getElementById("mgDate");
    if (dateEl) {
        const d = new Date();
        dateEl.textContent = d.toLocaleDateString("es-AR", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
    }

    // Burger mobile menu
    const burger = document.getElementById("mgBurger");
    const menu   = document.getElementById("mgMobileMenu");
    burger?.addEventListener("click", () => menu?.classList.toggle("open"));
    menu?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => menu.classList.remove("open")));

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener("click", e => {
            const t = document.querySelector(a.getAttribute("href"));
            if (t) { e.preventDefault(); t.scrollIntoView({ behavior:"smooth" }); }
        });
    });

    // Scroll reveal
    if ("IntersectionObserver" in window) {
        const els = document.querySelectorAll(".mg-hero-stat-item, .mg-stat-trio-item, .mg-contact-item, .ds-card, .mg-event");
        const obs = new IntersectionObserver(entries => {
            entries.forEach((e, i) => {
                if (e.isIntersecting) {
                    e.target.style.animation = `fadeUp 0.4s ease ${i * 0.06}s forwards`;
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
        els.forEach(el => { el.style.opacity = "0"; obs.observe(el); });
    }

    // ══ postMessage editor ══
    window.addEventListener("message", ({ data }) => {
        const { type, payload } = data || {};
        if (!type) return;
        switch (type) {
            case "INIT_CONFIG": {
                const cfg = payload; if (!cfg) return;
                Object.entries(cfg).forEach(([k, v]) => { if (typeof v === "string" || typeof v === "number") applyField(k, v); });
                applyCssVars(cfg);
                if (cfg.logo_url) applyLogo(cfg.logo_url);
                if (cfg.hero_bg_url !== undefined) applyHeroBg(cfg.hero_bg_url);
                if (cfg.about_img_url !== undefined) applyAboutImg(cfg.about_img_url);
                if (Array.isArray(cfg.dynamic_sections)) syncDynNav(cfg.dynamic_sections);
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
                if (key === "org_name")       { document.querySelectorAll(".footer-org-name").forEach(el => el.textContent = value); document.title = value; }
                if (key === "org_slogan")     document.querySelectorAll(".footer-slogan").forEach(el => el.textContent = value);
                if (key === "footer_tagline") document.querySelectorAll(".mg-footer-tag").forEach(el => el.textContent = value);
                if (key === "footer_copyright") { const el = document.querySelector(".mg-footer-bottom p"); if (el && value) el.textContent = value; }
                break;
            }
            case "ADD_SECTION":    addDynLink(payload.section); break;
            case "REMOVE_SECTION": {
                document.querySelectorAll(`a[href="#sec-${payload.secId}"]`).forEach(a => a.remove());
                document.getElementById(`sec-${payload.secId}`)?.remove();
                break;
            }
            case "UPDATE_SECTION": {
                document.getElementById(`sec-${payload.secId}`)?.querySelector(`[data-sec-field="${payload.field}"]`)?.textContent !== undefined
                    && (document.getElementById(`sec-${payload.secId}`).querySelector(`[data-sec-field="${payload.field}"]`).textContent = payload.value);
                break;
            }
        }
    });

    function applyField(k, v) { document.querySelectorAll(`[data-editable="${k}"]`).forEach(el => el.textContent = v); }

    function applyCssVars(cfg) {
        let s = document.getElementById("siteThemeVars");
        if (!s) { s = document.createElement("style"); s.id = "siteThemeVars"; document.head.appendChild(s); }
        let css = ":root {";
        if (cfg.color_bg_primary) css += `--bg:${cfg.color_bg_primary};--bg2:${cfg.color_bg_primary};--bg3:${cfg.color_bg_primary};--card:${cfg.color_bg_primary};`;
        if (cfg.color_accent)     css += `--accent:${cfg.color_accent};--accent2:${cfg.color_accent};--accent-glow:${cfg.color_accent}22;`;
        if (cfg.color_text)       css += `--text:${cfg.color_text};--text-muted:${cfg.color_text};`;
        if (cfg.font_display)     css += `--font-display:'${cfg.font_display}',Georgia,serif;`;
        if (cfg.font_body)        css += `--font-body:'${cfg.font_body}',Georgia,serif;`;
        css += "}"; s.textContent = css;
    }

    function applyCssVarsFromField(key, value) {
        const r = document.documentElement;
        const m = { color_bg_primary:["--bg","--bg2","--bg3","--card"], color_accent:["--accent","--accent2"], color_text:["--text","--text-muted"] };
        if (m[key]) { m[key].forEach(v => r.style.setProperty(v, value)); if (key==="color_accent") r.style.setProperty("--accent-glow", value+"22"); }
        if (key==="font_display") r.style.setProperty("--font-display", `'${value}',Georgia,serif`);
        if (key==="font_body")    r.style.setProperty("--font-body", `'${value}',Georgia,serif`);
    }

    function applyLogo(url) {
        ["mgLogo","mgFooterLogo"].forEach(id => { const el = document.getElementById(id); if (el) el.src = url; });
    }

    function applyHeroBg(url) {
        const wrap = document.querySelector(".mg-hero-img-wrap");
        if (!wrap) return;
        if (url) { wrap.innerHTML = `<img src="${url}" alt="" class="mg-hero-img hero-bg-img">`; }
        else { wrap.innerHTML = `<div class="mg-hero-img-placeholder"><span class="material-symbols-outlined">image</span></div>`; }
    }

    function applyAboutImg(url) {
        const wrap = document.querySelector(".about-image-wrap");
        if (!wrap || !url) return;
        let img = wrap.querySelector(".about-img");
        if (!img) { const ph = wrap.querySelector(".mg-about-placeholder"); ph?.remove(); img = document.createElement("img"); img.className = "mg-about-img about-img"; wrap.prepend(img); }
        img.src = url;
    }

    function syncDynNav(sections) {
        document.querySelectorAll("[data-dyn]").forEach(el => el.remove());
        const navEl   = document.querySelector(".mg-nav-inner");
        const menuEl  = document.getElementById("mgMobileMenu");
        const footEl  = document.querySelector(".mg-footer-nav-list");
        const contact = { nav: navEl?.querySelector('a[href="#contacto"]'), menu: menuEl?.querySelector('a[href="#contacto"]'), foot: footEl?.querySelector('a[href="#contacto"]') };
        sections.forEach(sec => {
            [[navEl, contact.nav, "mg-nav-a"], [menuEl, contact.menu, ""], [footEl, contact.foot, ""]].forEach(([parent, before, cls]) => {
                if (!parent) return;
                const a = document.createElement("a"); a.href = `#sec-${sec.id}`; a.dataset.dyn = sec.id; a.textContent = sec.nav_label||sec.title;
                if (cls) a.className = cls;
                if (before) parent.insertBefore(a, before); else parent.appendChild(a);
            });
        });
    }

    function addDynLink(sec) {
        [[".mg-nav-inner","mg-nav-a"],[`#mgMobileMenu`,""],[".mg-footer-nav-list",""]].forEach(([sel, cls]) => {
            const p = document.querySelector(sel); if (!p || p.querySelector(`a[href="#sec-${sec.id}"]`)) return;
            const contact = p.querySelector('a[href="#contacto"]');
            const a = document.createElement("a"); a.href=`#sec-${sec.id}`; a.dataset.dyn=sec.id; a.textContent=sec.nav_label||sec.title; if(cls) a.className=cls;
            if (contact) p.insertBefore(a, contact); else p.appendChild(a);
        });
    }

    function applyFooterLinks(links) {
        document.querySelectorAll(".mg-footer-nav-list a[data-fl]").forEach(a => a.remove());
        const nav = document.querySelector(".mg-footer-nav-list");
        if (!nav || !Array.isArray(links)) return;
        links.forEach(lnk => { if (!lnk.label||!lnk.url) return; const a=document.createElement("a"); a.href=lnk.url; a.target="_blank"; a.textContent=lnk.label; a.dataset.fl="1"; nav.appendChild(a); });
    }

    function applyEvents(events) {
        let sec = document.getElementById("eventos");
        if (!Array.isArray(events)||!events.length) { sec?.remove(); return; }
        if (!sec) { sec=document.createElement("section"); sec.className="mg-events"; sec.id="eventos"; document.getElementById("contacto")?.before(sec); }
        sec.innerHTML = `<div class="mg-wrap"><div class="mg-events-header"><span class="mg-section-label">Agenda</span><h2 class="mg-section-title">Próximos Eventos</h2></div><div class="mg-events-list">${events.map(ev => {
            const d = ev.date ? new Date(ev.date+"T12:00:00") : null;
            return `<div class="mg-event"><div class="mg-event-date-col">${d?`<span class="mg-event-day">${d.getDate()}</span><span class="mg-event-month">${d.toLocaleString("es-AR",{month:"short"}).toUpperCase()}</span>`:""}</div><div class="mg-event-body"><h3 class="mg-event-title">${esc(ev.name||"")}</h3>${ev.desc?`<p class="mg-event-desc">${esc(ev.desc)}</p>`:""}<div class="mg-event-meta">${ev.time?`<span><span class="material-symbols-outlined">schedule</span>${ev.time}</span>`:""} ${ev.place?`<span><span class="material-symbols-outlined">location_on</span>${esc(ev.place)}</span>`:""}</div>${ev.has_btn&&ev.btn_url?`<a href="${ev.btn_url}" class="mg-event-btn" target="_blank">${esc(ev.btn_text||"Inscribirse")}</a>`:""}</div></div>`;
        }).join("")}</div></div>`;
    }

    function applyAds(ads) {
        if (!Array.isArray(ads)) return;
        document.querySelectorAll(".mg-notice[data-dyn]").forEach(el=>el.remove());
        ads.filter(a=>a.type==="notice").forEach(ad => {
            const bar=document.createElement("div"); bar.className="mg-notice"; bar.dataset.dyn="1"; bar.style.background=ad.bg_color||"var(--mg-accent)";
            bar.innerHTML=`<div class="mg-notice-inner"><span class="material-symbols-outlined">campaign</span><span class="mg-notice-text">${esc(ad.title)}${ad.text?" — "+esc(ad.text):""}</span><button class="mg-notice-close" onclick="this.closest('.mg-notice').remove()"><span class="material-symbols-outlined">close</span></button></div>`;
            document.getElementById("mgMasthead")?.before(bar);
        });
        const banners=ads.filter(a=>a.type==="banner");
        let bEl=document.querySelector(".mg-banners[data-dyn]");
        if (banners.length) { if(!bEl){bEl=document.createElement("div");bEl.className="mg-banners";bEl.dataset.dyn="1";document.getElementById("nosotros")?.after(bEl);} bEl.innerHTML=`<div class="mg-wrap">${banners.map(ad=>`<a href="${ad.url||'#'}" class="mg-banner" target="_blank"><img src="${ad.img_url}" alt=""></a>`).join("")}</div>`; } else bEl?.remove();
        const sponsors=ads.filter(a=>a.type==="sponsor");
        let sEl=document.querySelector(".mg-sponsors[data-dyn]");
        if (sponsors.length) { if(!sEl){sEl=document.createElement("div");sEl.className="mg-sponsors";sEl.dataset.dyn="1";document.getElementById("nosotros")?.after(sEl);} sEl.innerHTML=`<div class="mg-wrap"><p class="mg-sponsors-lbl">Con el apoyo de</p><div class="mg-sponsors-row">${sponsors.map(ad=>`<a href="${ad.url||'#'}" class="mg-sponsor" target="_blank">${ad.logo_url?`<img src="${ad.logo_url}" alt="">` :`<span>${esc(ad.name||"")}</span>`}</a>`).join("")}</div></div>`; } else sEl?.remove();
    }

    function esc(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
});