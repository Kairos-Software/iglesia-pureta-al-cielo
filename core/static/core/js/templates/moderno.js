/* ====================================================
   MODERNO.JS — Template logic + Editor postMessage listener
   ==================================================== */

document.addEventListener("DOMContentLoaded", () => {

    // ── Nav scroll effect ──
    const nav = document.getElementById("mnNav");
    if (nav) {
        window.addEventListener("scroll", () => {
            nav.classList.toggle("scrolled", window.scrollY > 60);
        }, { passive: true });
    }

    // ── Burger / Drawer ──
    const burger = document.getElementById("navToggle");
    const drawer = document.getElementById("mnDrawer");
    const bg = document.getElementById("mnDrawerBg");
    if (burger && drawer && bg) {
        burger.addEventListener("click", () => {
            drawer.classList.toggle("open");
            bg.classList.toggle("open");
        });
        bg.addEventListener("click", () => {
            drawer.classList.remove("open");
            bg.classList.remove("open");
        });
        drawer.querySelectorAll(".mn-drawer-link").forEach(link => {
            link.addEventListener("click", () => {
                drawer.classList.remove("open");
                bg.classList.remove("open");
            });
        });
    }

    // ── Smooth scroll ──
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener("click", e => {
            const target = document.querySelector(a.getAttribute("href"));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });

    // ── Reveal on scroll ──
    if ("IntersectionObserver" in window) {
        const items = document.querySelectorAll(
            ".mn-hstat, .mn-astat, .mn-contact-item, .ds-card, .mn-event, .dynamic-section"
        );
        const obs = new IntersectionObserver(entries => {
            entries.forEach((e, i) => {
                if (e.isIntersecting) {
                    e.target.style.animation = `fadeUp 0.5s ease ${i * 0.05}s forwards`;
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
        items.forEach(el => { el.style.opacity = "0"; obs.observe(el); });
    }

    // ════════════════════════════════════
    // EDITOR — postMessage listener
    // ════════════════════════════════════
    window.addEventListener("message", (e) => {
        const { type, payload } = e.data || {};
        if (!type) return;

        switch (type) {
            case "INIT_CONFIG": {
                const cfg = payload;
                if (!cfg) return;
                // Actualizar atributo data-template
                if (cfg.template) document.documentElement.setAttribute("data-template", cfg.template);
                Object.entries(cfg).forEach(([key, val]) => {
                    if (typeof val === "string" || typeof val === "number") {
                        applyField(key, val);
                    }
                });
                applyCssVars(cfg);
                if (cfg.logo_url) applyLogo(cfg.logo_url);
                if (Array.isArray(cfg.dynamic_sections)) applyDynNav(cfg.dynamic_sections);
                if (cfg.hero_bg_url !== undefined) applyHeroBg(cfg.hero_bg_url);
                if (cfg.about_img_url !== undefined) applyAboutImg(cfg.about_img_url);
                break;
            }
            case "UPDATE_FIELD": {
                const { key, value } = payload;
                if (!key) return;
                applyField(key, value);
                if (key === "logo_url") applyLogo(value);
                if (key === "hero_bg_url") applyHeroBg(value);
                if (key === "about_img_url") applyAboutImg(value);
                if (key.startsWith("color_") || key.startsWith("font_")) {
                    applyCssVarsFromField(key, value);
                }
                if (key === "events") applyEvents(value);
                if (key === "ads") applyAds(value);
                if (key === "footer_links") applyFooterLinks(value);
                if (key === "footer_copyright") applyFooterCopyright(value);
                if (key === "footer_tagline") applyFooterTagline(value);
                if (key === "org_name") applyOrgName(value);
                if (key === "org_slogan") applyOrgSlogan(value);
                break;
            }
            case "ADD_SECTION": {
                const sec = payload.section;
                if (sec) addNavLink(sec);
                break;
            }
            case "REMOVE_SECTION": {
                const link = document.querySelector(`a[href="#sec-${payload.secId}"]`);
                if (link) link.remove();
                const secEl = document.getElementById(`sec-${payload.secId}`);
                if (secEl) secEl.remove();
                break;
            }
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

    // ── Helpers ──
    function applyField(key, value) {
        document.querySelectorAll(`[data-editable="${key}"]`).forEach(el => {
            el.textContent = value;
        });
    }

    function applyCssVars(cfg) {
        const style = document.getElementById("siteThemeVars") || document.createElement("style");
        style.id = "siteThemeVars";
        let css = ":root {";
        if (cfg.color_bg_primary) css += `--bg:${cfg.color_bg_primary};`;
        if (cfg.color_accent) css += `--accent:${cfg.color_accent};`;
        if (cfg.color_text) css += `--text:${cfg.color_text};`;
        if (cfg.font_display) css += `--font-display:'${cfg.font_display}',Georgia,serif;`;
        if (cfg.font_body) css += `--font-body:'${cfg.font_body}',system-ui,sans-serif;`;
        css += "}";
        style.textContent = css;
        if (!style.parentNode) document.head.appendChild(style);
    }

    function applyCssVarsFromField(key, value) {
        const root = document.documentElement;
        if (key === "color_bg_primary") root.style.setProperty("--bg", value);
        if (key === "color_accent") root.style.setProperty("--accent", value);
        if (key === "color_text") root.style.setProperty("--text", value);
        if (key === "font_display") root.style.setProperty("--font-display", `'${value}',Georgia,serif`);
        if (key === "font_body") root.style.setProperty("--font-body", `'${value}',system-ui,sans-serif`);
    }

    function applyLogo(url) {
        document.querySelectorAll("#navLogo, .mn-footer-logo").forEach(el => {
            if (el.tagName === "IMG") {
                el.src = url;
            } else {
                const img = document.createElement("img");
                img.src = url;
                img.alt = "Logo";
                img.className = "mn-logo-img";
                if (el.id) img.id = el.id;
                el.replaceWith(img);
            }
        });
    }

    function applyHeroBg(url) {
        let bg = document.querySelector(".mn-hero-bg");
        if (url) {
            if (!bg) {
                bg = document.createElement("div");
                bg.className = "mn-hero-bg";
                document.querySelector(".mn-hero")?.prepend(bg);
            }
            bg.style.backgroundImage = `url('${url}')`;
        } else {
            bg?.remove();
        }
    }

    function applyAboutImg(url) {
        const wrap = document.querySelector(".about-image-wrap");
        if (!wrap) return;
        if (url) {
            let img = wrap.querySelector(".about-img");
            if (!img) {
                wrap.innerHTML = `<img src="${url}" alt="Nosotros" class="mn-about-img about-img">`;
            } else {
                img.src = url;
            }
        } else {
            wrap.innerHTML = `<div class="mn-about-placeholder"><span class="material-symbols-outlined">groups</span></div>`;
        }
    }

    function applyDynNav(sections) {
        document.querySelectorAll(".mn-nav-link[data-dyn], .mn-drawer-link[data-dyn]").forEach(a => a.remove());
        const nav = document.getElementById("mnNavLinks");
        const drawer = document.getElementById("mnDrawer");
        const contactNav = nav?.querySelector('a[href="#contacto"]');
        const contactDrawer = drawer?.querySelector('a[href="#contacto"]');
        sections.forEach(sec => {
            [{ parent: nav, contact: contactNav, cls: "mn-nav-link" },
             { parent: drawer, contact: contactDrawer, cls: "mn-drawer-link" }].forEach(({ parent, contact, cls }) => {
                if (!parent) return;
                const a = document.createElement("a");
                a.href = `#sec-${sec.id}`;
                a.dataset.dyn = sec.id;
                a.textContent = sec.nav_label || sec.title;
                a.className = cls;
                if (contact) parent.insertBefore(a, contact);
                else parent.appendChild(a);
            });
        });
    }

    function addNavLink(sec) {
        const nav = document.getElementById("mnNavLinks");
        if (nav && !nav.querySelector(`a[href="#sec-${sec.id}"]`)) {
            const contact = nav.querySelector('a[href="#contacto"]');
            const a = document.createElement("a");
            a.href = `#sec-${sec.id}`;
            a.dataset.dyn = sec.id;
            a.textContent = sec.nav_label || sec.title;
            a.className = "mn-nav-link";
            if (contact) nav.insertBefore(a, contact);
            else nav.appendChild(a);
        }
    }

    function applyOrgName(value) {
        document.querySelectorAll(".footer-org-name, .mn-footer-name, .mn-org-name").forEach(el => {
            el.textContent = value;
        });
        document.title = value;
    }

    function applyOrgSlogan(value) {
        document.querySelectorAll(".footer-slogan, .mn-footer-tagline, .mn-org-slogan").forEach(el => {
            el.textContent = value;
        });
    }

    function applyFooterCopyright(value) {
        const el = document.querySelector(".mn-footer-bottom p");
        if (el && value) el.textContent = value;
    }

    function applyFooterTagline(value) {
        const el = document.querySelector(".mn-footer-tagline");
        if (el && value) el.textContent = value;
    }

    function applyFooterLinks(links) {
        document.querySelectorAll(".mn-footer-nav a[data-fl]").forEach(a => a.remove());
        const footerNav = document.querySelector(".mn-footer-nav");
        if (!footerNav || !Array.isArray(links)) return;
        links.forEach(lnk => {
            if (!lnk.label || !lnk.url) return;
            const a = document.createElement("a");
            a.href = lnk.url;
            a.target = "_blank";
            a.textContent = lnk.label;
            a.dataset.fl = "1";
            footerNav.appendChild(a);
        });
    }

    function applyEvents(events) {
        let section = document.getElementById("eventos");
        if (!Array.isArray(events) || events.length === 0) {
            if (section) section.remove();
            return;
        }
        if (!section) {
            section = document.createElement("section");
            section.className = "mn-events";
            section.id = "eventos";
            const contactSection = document.getElementById("contacto");
            if (contactSection) contactSection.parentNode.insertBefore(section, contactSection);
            else document.querySelector(".site-content")?.appendChild(section);
        }
        section.innerHTML = `
            <div class="mn-wrap">
                <h2 class="mn-section-title">Próximos Eventos</h2>
                <div class="mn-events-list">
                    ${events.map(ev => {
                        const dateObj = ev.date ? new Date(ev.date + "T12:00:00") : null;
                        const day = dateObj ? dateObj.getDate() : "";
                        const month = dateObj ? dateObj.toLocaleString("es-AR", { month: "short" }).toUpperCase() : "";
                        return `
                        <article class="mn-event">
                            ${ev.img_url ? `<div class="mn-event-img" style="background-image:url('${ev.img_url}')"></div>` : ""}
                            <div class="mn-event-content">
                                <div class="mn-event-date">
                                    ${ev.date ? `<span class="mn-event-day">${day}</span><span class="mn-event-month">${month}</span>` : ""}
                                </div>
                                <h3 class="mn-event-title">${escHtml(ev.name || "")}</h3>
                                ${ev.desc ? `<p class="mn-event-desc">${escHtml(ev.desc)}</p>` : ""}
                                <div class="mn-event-meta">
                                    ${ev.time ? `<span><span class="material-symbols-outlined">schedule</span>${ev.time}</span>` : ""}
                                    ${ev.place ? `<span><span class="material-symbols-outlined">location_on</span>${escHtml(ev.place)}</span>` : ""}
                                </div>
                                ${ev.has_btn && ev.btn_url ? `<a href="${ev.btn_url}" class="mn-event-btn" target="_blank">${escHtml(ev.btn_text || "Inscribirse")}</a>` : ""}
                            </div>
                        </article>`;
                    }).join("")}
                </div>
            </div>`;
    }

    function applyAds(ads) {
        if (!Array.isArray(ads)) return;

        // Notices
        document.querySelectorAll(".mn-notice[data-dyn]").forEach(el => el.remove());
        ads.filter(a => a.type === "notice").forEach(ad => {
            const bar = document.createElement("div");
            bar.className = "mn-notice";
            bar.dataset.dyn = "1";
            bar.style.background = ad.bg_color || "#c9a84c";
            bar.innerHTML = `
                <div class="mn-wrap mn-notice-inner">
                    <span class="material-symbols-outlined">campaign</span>
                    <span class="mn-notice-text">${escHtml(ad.title)}${ad.text ? " — " + escHtml(ad.text) : ""}</span>
                    <button class="mn-notice-close" onclick="this.closest('.mn-notice').remove()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>`;
            const nav = document.getElementById("mnNav");
            if (nav) nav.after(bar);
        });

        // Banners
        let bannersSection = document.querySelector(".mn-banners[data-dyn]");
        const banners = ads.filter(a => a.type === "banner");
        if (banners.length > 0) {
            if (!bannersSection) {
                bannersSection = document.createElement("div");
                bannersSection.className = "mn-banners";
                bannersSection.dataset.dyn = "1";
                const aboutSection = document.getElementById("nosotros");
                if (aboutSection) aboutSection.after(bannersSection);
            }
            bannersSection.innerHTML = `<div class="mn-wrap">${banners.map(ad =>
                `<a href="${ad.url || '#'}" class="mn-banner" target="_blank"><img src="${ad.img_url}" alt="${escHtml(ad.alt || 'Banner')}"></a>`
            ).join("")}</div>`;
        } else {
            if (bannersSection) bannersSection.remove();
        }

        // Sponsors
        let sponsorsSection = document.querySelector(".mn-sponsors[data-dyn]");
        const sponsors = ads.filter(a => a.type === "sponsor");
        if (sponsors.length > 0) {
            if (!sponsorsSection) {
                sponsorsSection = document.createElement("div");
                sponsorsSection.className = "mn-sponsors";
                sponsorsSection.dataset.dyn = "1";
                const aboutSection = document.getElementById("nosotros");
                if (aboutSection) aboutSection.after(sponsorsSection);
            }
            sponsorsSection.innerHTML = `
                <div class="mn-wrap">
                    <p class="mn-sponsors-label">Con el apoyo de</p>
                    <div class="mn-sponsors-grid">
                        ${sponsors.map(ad => `
                        <a href="${ad.url || '#'}" class="mn-sponsor" target="_blank">
                            ${ad.logo_url ? `<img src="${ad.logo_url}" alt="${escHtml(ad.name || '')}">` : `<span>${escHtml(ad.name || '')}</span>`}
                        </a>`).join("")}
                    </div>
                </div>`;
        } else {
            if (sponsorsSection) sponsorsSection.remove();
        }
    }

    function escHtml(s) {
        return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // Añadir animación fadeUp si no existe en CSS
    const style = document.createElement("style");
    style.textContent = `
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
});