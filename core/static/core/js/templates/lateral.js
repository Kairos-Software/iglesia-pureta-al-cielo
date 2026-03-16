/* lateral.js - Versión mejorada con soporte para imagen de fondo en hero y sponsors */
document.addEventListener("DOMContentLoaded", () => {

    const sidebar = document.getElementById("ltSidebar");
    const main    = document.getElementById("ltMain");
    const overlay = document.getElementById("ltSidebarOverlay");

    // ── Colapsar sidebar (desktop) ──
    const collapseBtn = document.getElementById("ltCollapseBtn");
    collapseBtn?.addEventListener("click", () => {
        const collapsed = sidebar.classList.toggle("collapsed");
        const icon = collapseBtn.querySelector(".material-symbols-outlined");
        if (icon) icon.textContent = collapsed ? "chevron_right" : "chevron_left";
        localStorage.setItem("ltSidebarCollapsed", collapsed ? "1" : "0");
    });
    if (localStorage.getItem("ltSidebarCollapsed") === "1") {
        sidebar.classList.add("collapsed");
        const icon = collapseBtn?.querySelector(".material-symbols-outlined");
        if (icon) icon.textContent = "chevron_right";
    }

    // ── Mobile burger ──
    const mobileBurger = document.getElementById("ltMobileBurger");
    const openMobile  = () => { sidebar.classList.add("mobile-open"); overlay.style.display = "block"; };
    const closeMobile = () => { sidebar.classList.remove("mobile-open"); overlay.style.display = "none"; };
    mobileBurger?.addEventListener("click", openMobile);
    overlay?.addEventListener("click", closeMobile);

    // ── Mostrar/ocultar burger en mobile ──
    const checkMobile = () => {
        if (window.innerWidth <= 768) { mobileBurger && (mobileBurger.style.display = "flex"); }
        else { mobileBurger && (mobileBurger.style.display = "none"); closeMobile(); }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // ── Active nav + topbar title on scroll ──
    const sections = ["inicio","envivo","nosotros","eventos","contacto"];
    const navLinks = document.querySelectorAll(".lt-nav-a[data-section], .lt-nav-a[data-dyn]");
    const topbarTitle = document.getElementById("ltTopbarTitle");

    const labelMap = { inicio:"Inicio", envivo:"En Vivo", nosotros:"Nosotros", eventos:"Eventos", contacto:"Contacto" };

    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting && e.intersectionRatio > 0.3) {
                const id = e.target.id;
                navLinks.forEach(a => a.classList.remove("active"));
                const active = document.querySelector(`.lt-nav-a[data-section="${id}"], .lt-nav-a[data-dyn="${id}"]`);
                active?.classList.add("active");
                if (topbarTitle) topbarTitle.textContent = active?.querySelector("span:not(.material-symbols-outlined):not(.lt-nav-live-dot)")?.textContent || labelMap[id] || id;
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll("section[id], footer[id]").forEach(el => obs.observe(el));

    // ── Smooth scroll + close mobile ──
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener("click", e => {
            const t = document.querySelector(a.getAttribute("href"));
            if (t) { e.preventDefault(); t.scrollIntoView({ behavior:"smooth" }); closeMobile(); }
        });
    });

    // ── Scroll reveal ──
    if ("IntersectionObserver" in window) {
        const els = document.querySelectorAll(".lt-stat-card, .lt-stat-row, .lt-contact-item, .ds-card, .lt-event, .lt-sponsor-card");
        const revObs = new IntersectionObserver(entries => {
            entries.forEach((e, i) => {
                if (e.isIntersecting) { e.target.style.animation = `fadeUp 0.35s ease ${i*0.05}s forwards`; revObs.unobserve(e.target); }
            });
        }, { threshold: 0.1 });
        els.forEach(el => { el.style.opacity="0"; revObs.observe(el); });
    }

    // ══════════════════════════════════════
    // EDITOR — postMessage
    // ══════════════════════════════════════
    window.addEventListener("message", ({ data }) => {
        const { type, payload } = data || {};
        if (!type) return;
        switch (type) {
            case "INIT_CONFIG": {
                const cfg = payload; if (!cfg) return;
                Object.entries(cfg).forEach(([k,v]) => { if (typeof v==="string"||typeof v==="number") applyField(k,v); });
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
                if (key==="logo_url")      applyLogo(value);
                if (key==="hero_bg_url")   applyHeroBg(value);
                if (key==="about_img_url") applyAboutImg(value);
                if (key.startsWith("color_")||key.startsWith("font_")) applyCssVarsFromField(key,value);
                if (key==="events")        applyEvents(value);
                if (key==="ads")           applyAds(value);
                if (key==="footer_links")  applyFooterLinks(value);
                if (key==="org_name")      { document.querySelectorAll(".footer-org-name").forEach(el=>el.textContent=value); document.title=value; }
                if (key==="org_slogan")    document.querySelectorAll(".footer-slogan").forEach(el=>el.textContent=value);
                if (key==="footer_copyright") { const el=document.querySelector(".lt-footer-copy"); if(el&&value) el.textContent=value; }
                break;
            }
            case "ADD_SECTION":    addDynLink(payload.section); break;
            case "REMOVE_SECTION": {
                document.querySelectorAll(`a[data-dyn="${payload.secId}"]`).forEach(a=>a.remove());
                document.getElementById(`sec-${payload.secId}`)?.remove();
                break;
            }
            case "UPDATE_SECTION": {
                const el=document.getElementById(`sec-${payload.secId}`)?.querySelector(`[data-sec-field="${payload.field}"]`);
                if(el) el.textContent=payload.value;
                break;
            }
        }
    });

    function applyField(k,v) { document.querySelectorAll(`[data-editable="${k}"]`).forEach(el=>el.textContent=v); }

    function applyCssVars(cfg) {
        let s=document.getElementById("siteThemeVars");
        if(!s){s=document.createElement("style");s.id="siteThemeVars";document.head.appendChild(s);}
        let css=":root {";
        if(cfg.color_bg_primary) css+=`--bg:${cfg.color_bg_primary};--bg2:${cfg.color_bg_primary};--bg3:${cfg.color_bg_primary};--card:${cfg.color_bg_primary};`;
        if(cfg.color_accent)     css+=`--accent:${cfg.color_accent};--accent2:${cfg.color_accent};--accent-glow:${cfg.color_accent}22;`;
        if(cfg.color_text)       css+=`--text:${cfg.color_text};--text-muted:${cfg.color_text};`;
        if(cfg.font_display)     css+=`--font-display:'${cfg.font_display}',system-ui,sans-serif;`;
        if(cfg.font_body)        css+=`--font-body:'${cfg.font_body}',system-ui,sans-serif;`;
        css+="}"; s.textContent=css;
    }

    function applyCssVarsFromField(key,value) {
        const r=document.documentElement;
        const m={color_bg_primary:["--bg","--bg2","--bg3","--card"],color_accent:["--accent","--accent2"],color_text:["--text","--text-muted"]};
        if(m[key]){m[key].forEach(v=>r.style.setProperty(v,value));if(key==="color_accent")r.style.setProperty("--accent-glow",value+"22");}
        if(key==="font_display") r.style.setProperty("--font-display",`'${value}',system-ui,sans-serif`);
        if(key==="font_body")    r.style.setProperty("--font-body",`'${value}',system-ui,sans-serif`);
    }

    function applyLogo(url) {
        ["ltSidebarLogo","ltFooterLogo"].forEach(id=>{ const el=document.getElementById(id); if(el) el.src=url; });
    }

    function applyHeroBg(url) {
        const heroBg = document.querySelector(".lt-hero-bg");
        if (!heroBg) return;
        if (url) {
            heroBg.style.backgroundImage = `url('${url}')`;
            heroBg.style.opacity = "0.2";
        } else {
            heroBg.style.backgroundImage = "none";
        }
    }

    function applyAboutImg(url) {
        const wrap=document.querySelector(".about-image-wrap .lt-about-img-wrap");
        if(!wrap||!url) return;
        let img=wrap.querySelector(".about-img");
        if(!img){wrap.innerHTML=`<img src="${url}" alt="Nosotros" class="lt-about-img about-img">`;}
        else img.src=url;
    }

    function syncDynNav(sections) {
        document.querySelectorAll(".lt-nav-a[data-dyn]").forEach(a=>a.remove());
        const nav=document.getElementById("ltNav");
        if(!nav) return;
        const contactLink=nav.querySelector('a[data-section="contacto"]');
        const labelSection=nav.querySelector(".lt-nav-section-label:last-of-type") || contactLink;
        sections.forEach(sec=>{
            if(nav.querySelector(`a[data-dyn="${sec.id}"]`)) return;
            const a=document.createElement("a"); a.href=`#sec-${sec.id}`; a.className="lt-nav-a"; a.dataset.dyn=sec.id;
            a.innerHTML=`<span class="material-symbols-outlined">widgets</span><span>${esc(sec.nav_label||sec.title)}</span>`;
            if(contactLink) nav.insertBefore(a,contactLink); else nav.appendChild(a);
        });
    }

    function addDynLink(sec) {
        const nav=document.getElementById("ltNav");
        if(!nav||nav.querySelector(`a[data-dyn="${sec.id}"]`)) return;
        const contact=nav.querySelector('a[data-section="contacto"]');
        const a=document.createElement("a"); a.href=`#sec-${sec.id}`; a.className="lt-nav-a"; a.dataset.dyn=sec.id;
        a.innerHTML=`<span class="material-symbols-outlined">widgets</span><span>${esc(sec.nav_label||sec.title)}</span>`;
        if(contact) nav.insertBefore(a,contact); else nav.appendChild(a);
    }

    function applyFooterLinks(links) { /* lateral footer es compacto, links no aplican visualmente */ }

    function applyEvents(events) {
        let sec=document.getElementById("eventos");
        if(!Array.isArray(events)||!events.length){sec?.remove();return;}
        if(!sec){sec=document.createElement("section");sec.className="lt-events";sec.id="eventos";document.getElementById("contacto")?.before(sec);}
        sec.innerHTML=`<div class="lt-section-header"><span class="lt-section-tag">Agenda</span><div class="lt-section-title">Próximos Eventos</div></div><div class="lt-events-grid">${events.map(ev=>{
            const d=ev.date?new Date(ev.date+"T12:00:00"):null;
            return `<div class="lt-event"><div class="lt-event-date">${d?`<span class="lt-event-day">${d.getDate()}</span><span class="lt-event-month">${d.toLocaleString("es-AR",{month:"short"}).toUpperCase()}</span>`:""}</div><div><div class="lt-event-title">${esc(ev.name||"")}</div>${ev.desc?`<div class="lt-event-desc">${esc(ev.desc)}</div>`:""}<div class="lt-event-meta">${ev.time?`<span><span class="material-symbols-outlined">schedule</span>${ev.time}</span>`:""} ${ev.place?`<span><span class="material-symbols-outlined">location_on</span>${esc(ev.place)}</span>`:""}</div></div>${ev.has_btn&&ev.btn_url?`<a href="${ev.btn_url}" class="lt-event-btn" target="_blank">${esc(ev.btn_text||"Inscribirse")}</a>`:""}</div>`;
        }).join("")}</div>`;
    }

    function applyAds(ads) {
        if(!Array.isArray(ads)) return;
        document.querySelectorAll(".lt-notice[data-dyn]").forEach(el=>el.remove());
        ads.filter(a=>a.type==="notice").forEach(ad=>{
            const bar=document.createElement("div"); bar.className="lt-notice"; bar.dataset.dyn="1"; bar.style.cssText=`background:${ad.bg_color||"var(--lt-green)"};color:var(--lt-bg)`;
            bar.innerHTML=`<span class="material-symbols-outlined">campaign</span><span class="lt-notice-text">${esc(ad.title)}${ad.text?" — "+esc(ad.text):""}</span><button onclick="this.closest('.lt-notice').remove()"><span class="material-symbols-outlined">close</span></button>`;
            document.getElementById("ltTopbar")?.after(bar);
        });
        const banners=ads.filter(a=>a.type==="banner");
        let bEl=document.querySelector(".lt-banners[data-dyn]");
        if(banners.length){
            if(!bEl){bEl=document.createElement("div");bEl.className="lt-banners";bEl.dataset.dyn="1";document.getElementById("nosotros")?.after(bEl);}
            bEl.innerHTML=`<div class="lt-banners-inner">${banners.map(ad=>`<a href="${ad.url||'#'}" class="lt-banner" target="_blank"><img src="${ad.img_url}" alt="${esc(ad.alt||'Banner')}"></a>`).join("")}</div>`;
        } else bEl?.remove();

        const sponsors=ads.filter(a=>a.type==="sponsor");
        let sEl=document.querySelector(".lt-sponsors-section[data-dyn]");
        if(sponsors.length){
            if(!sEl){
                sEl=document.createElement("div");sEl.className="lt-sponsors-section";sEl.dataset.dyn="1";
                document.getElementById("nosotros")?.after(sEl);
            }
            sEl.innerHTML=`
                <div class="lt-sponsors-inner">
                    <p class="lt-sponsors-label">Con el apoyo de</p>
                    <div class="lt-sponsors-grid">
                        ${sponsors.map(ad=>`
                            <a href="${ad.url||'#'}" class="lt-sponsor-card" target="_blank">
                                ${ad.logo_url?`<img src="${ad.logo_url}" alt="${esc(ad.name||'')}" class="lt-sponsor-logo">`:`<span class="lt-sponsor-name">${esc(ad.name||'')}</span>`}
                            </a>
                        `).join("")}
                    </div>
                </div>`;
        } else sEl?.remove();
    }

    function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
});