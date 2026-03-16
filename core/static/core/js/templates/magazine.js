/* ====================================================
   magazine.js - Lógica específica para plantilla Magazine
   ==================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Fecha en el header
  const dateEl = document.getElementById("mgDate");
  if (dateEl) {
    const d = new Date();
    dateEl.textContent = d.toLocaleDateString("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Menú móvil
  const burger = document.getElementById("mgBurger");
  const mobileMenu = document.getElementById("mgMobileMenu");
  if (burger && mobileMenu) {
    burger.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
    });
    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
      });
    });
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Scroll reveal (opcional)
  if ("IntersectionObserver" in window) {
    const items = document.querySelectorAll(
      ".mg-stat-item, .mg-event-card, .mg-about-content, .mg-contact-item"
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    items.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      observer.observe(el);
    });
  }

  // Editor postMessage (igual que en Kaircam pero con selectores mg-)
  window.addEventListener("message", (e) => {
    const { type, payload } = e.data || {};
    if (!type) return;

    const applyField = (key, value) => {
      document.querySelectorAll(`[data-editable="${key}"]`).forEach((el) => {
        el.textContent = value;
      });
    };

    const applyCssVars = (cfg) => {
      const style = document.getElementById("siteThemeVars") || document.createElement("style");
      style.id = "siteThemeVars";
      let css = ":root {";
      if (cfg.color_bg_primary) css += `--bg:${cfg.color_bg_primary};`;
      if (cfg.color_accent) css += `--accent:${cfg.color_accent};`;
      if (cfg.color_text) css += `--text:${cfg.color_text};`;
      if (cfg.font_display) css += `--font-display:'${cfg.font_display}',Georgia,serif;`;
      if (cfg.font_body) css += `--font-body:'${cfg.font_body}',sans-serif;`;
      css += "}";
      style.textContent = css;
      if (!style.parentNode) document.head.appendChild(style);
    };

    const applyLogo = (url) => {
      const logo = document.getElementById("mgLogo");
      if (logo) logo.src = url;
    };

    const applyAboutImg = (url) => {
      const wrap = document.querySelector(".about-image-wrap");
      if (!wrap) return;
      if (url) {
        wrap.innerHTML = `<img src="${url}" alt="Sobre nosotros" class="about-img" style="width:100%;height:100%;object-fit:cover">`;
      } else {
        wrap.innerHTML = `<div class="mg-about-placeholder"><span class="material-symbols-outlined">groups</span></div>`;
      }
    };

    const applyHeroBg = (url) => {
      const heroImage = document.querySelector(".mg-hero-image");
      if (!heroImage) return;
      if (url) {
        heroImage.style.backgroundImage = `url('${url}')`;
        heroImage.classList.remove("mg-hero-placeholder");
      } else {
        heroImage.style.backgroundImage = "";
        heroImage.classList.add("mg-hero-placeholder");
        heroImage.innerHTML = '<span class="material-symbols-outlined">image</span>';
      }
    };

    const applyDynNav = (sections) => {
      const nav = document.querySelector(".mg-nav-inner");
      const mobileNav = document.querySelector(".mg-mobile-menu .mg-wrap");
      if (!nav || !mobileNav) return;
      // Limpiar links dinámicos previos
      nav.querySelectorAll("a[data-dyn]").forEach((a) => a.remove());
      mobileNav.querySelectorAll("a[data-dyn]").forEach((a) => a.remove());

      const contactNav = nav.querySelector('a[href="#contacto"]');
      const contactMobile = mobileNav.querySelector('a[href="#contacto"]');

      sections.forEach((sec) => {
        const label = sec.nav_label || sec.title;
        const linkNav = document.createElement("a");
        linkNav.href = `#sec-${sec.id}`;
        linkNav.className = "mg-nav-link";
        linkNav.dataset.dyn = sec.id;
        linkNav.textContent = label;
        nav.insertBefore(linkNav, contactNav);

        const linkMobile = document.createElement("a");
        linkMobile.href = `#sec-${sec.id}`;
        linkMobile.dataset.dyn = sec.id;
        linkMobile.textContent = label;
        mobileNav.insertBefore(linkMobile, contactMobile);
      });
    };

    const applyEvents = (events) => {
      let section = document.getElementById("eventos");
      if (!Array.isArray(events) || events.length === 0) {
        if (section) section.remove();
        return;
      }
      if (!section) {
        section = document.createElement("section");
        section.id = "eventos";
        section.className = "mg-events";
        document.getElementById("contacto")?.before(section);
      }
      const html = events.map(ev => {
        const dateObj = ev.date ? new Date(ev.date + "T12:00:00") : null;
        const day = dateObj ? dateObj.getDate() : "";
        const month = dateObj ? dateObj.toLocaleString("es-AR", { month: "short" }).toUpperCase() : "";
        return `
          <div class="mg-event-card">
            ${ev.img_url ? `<div class="mg-event-img" style="background-image:url('${ev.img_url}')"></div>` : ""}
            <div class="mg-event-content">
              ${ev.date ? `<div class="mg-event-date"><span class="mg-event-day">${day}</span><span class="mg-event-month">${month}</span></div>` : ""}
              <h3 class="mg-event-title">${ev.name || ""}</h3>
              ${ev.desc ? `<p class="mg-event-desc">${ev.desc}</p>` : ""}
              <div class="mg-event-meta">
                ${ev.time ? `<span><span class="material-symbols-outlined">schedule</span>${ev.time}</span>` : ""}
                ${ev.place ? `<span><span class="material-symbols-outlined">location_on</span>${ev.place}</span>` : ""}
              </div>
              ${ev.has_btn && ev.btn_url ? `<a href="${ev.btn_url}" class="mg-event-btn">${ev.btn_text || "Inscribirse"}</a>` : ""}
            </div>
          </div>
        `;
      }).join("");
      section.innerHTML = `
        <div class="mg-wrap">
          <div class="mg-section-header">
            <span class="mg-section-tag">Agenda</span>
            <h2 class="mg-section-title">Próximos Eventos</h2>
          </div>
          <div class="mg-events-grid">${html}</div>
        </div>
      `;
    };

    const applyAds = (ads) => {
      // Notices
      document.querySelectorAll(".mg-notice[data-dyn]").forEach(el => el.remove());
      ads.filter(a => a.type === "notice").forEach(ad => {
        const notice = document.createElement("div");
        notice.className = "mg-notice";
        notice.dataset.dyn = "1";
        notice.style.background = ad.bg_color || "#8b5a2b";
        notice.innerHTML = `
          <div class="mg-wrap">
            <span class="material-symbols-outlined">campaign</span>
            <span>${ad.title}${ad.text ? " — " + ad.text : ""}</span>
            <button class="mg-notice-close" onclick="this.parentElement.parentElement.remove()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        `;
        document.querySelector(".mg-header")?.before(notice);
      });

      // Banners
      let bannersSec = document.querySelector(".mg-banners[data-dyn]");
      const banners = ads.filter(a => a.type === "banner");
      if (banners.length) {
        if (!bannersSec) {
          bannersSec = document.createElement("section");
          bannersSec.className = "mg-banners";
          bannersSec.dataset.dyn = "1";
          document.getElementById("nosotros")?.after(bannersSec);
        }
        bannersSec.innerHTML = `<div class="mg-wrap">${banners.map(ad => `
          <a href="${ad.url || '#'}" class="mg-banner" target="_blank">
            <img src="${ad.img_url}" alt="${ad.alt || 'Banner'}">
          </a>
        `).join("")}</div>`;
      } else if (bannersSec) {
        bannersSec.remove();
      }

      // Sponsors
      let sponsorsSec = document.querySelector(".mg-sponsors[data-dyn]");
      const sponsors = ads.filter(a => a.type === "sponsor");
      if (sponsors.length) {
        if (!sponsorsSec) {
          sponsorsSec = document.createElement("section");
          sponsorsSec.className = "mg-sponsors";
          sponsorsSec.dataset.dyn = "1";
          document.getElementById("nosotros")?.after(sponsorsSec);
        }
        sponsorsSec.innerHTML = `
          <div class="mg-wrap">
            <p class="mg-sponsors-label">Con el apoyo de</p>
            <div class="mg-sponsors-grid">
              ${sponsors.map(ad => `
                <a href="${ad.url || '#'}" class="mg-sponsor" target="_blank">
                  ${ad.logo_url ? `<img src="${ad.logo_url}" alt="${ad.name}">` : `<span>${ad.name}</span>`}
                </a>
              `).join("")}
            </div>
          </div>
        `;
      } else if (sponsorsSec) {
        sponsorsSec.remove();
      }
    };

    switch (type) {
      case "INIT_CONFIG":
        const cfg = payload;
        if (!cfg) return;
        Object.entries(cfg).forEach(([k, v]) => {
          if (typeof v === "string" || typeof v === "number") applyField(k, v);
        });
        applyCssVars(cfg);
        if (cfg.logo_url) applyLogo(cfg.logo_url);
        if (cfg.hero_bg_url !== undefined) applyHeroBg(cfg.hero_bg_url);
        if (cfg.about_img_url !== undefined) applyAboutImg(cfg.about_img_url);
        if (Array.isArray(cfg.dynamic_sections)) applyDynNav(cfg.dynamic_sections);
        break;

      case "UPDATE_FIELD":
        const { key, value } = payload;
        if (!key) return;
        applyField(key, value);
        if (key === "logo_url") applyLogo(value);
        if (key === "hero_bg_url") applyHeroBg(value);
        if (key === "about_img_url") applyAboutImg(value);
        if (key.startsWith("color_") || key.startsWith("font_")) applyCssVars({ [key]: value });
        if (key === "events") applyEvents(value);
        if (key === "ads") applyAds(value);
        if (key === "org_name") document.title = value;
        break;

      case "ADD_SECTION":
        // Recargar iframe es más seguro, pero podemos agregar el nav link
        const sec = payload.section;
        if (sec) {
          const nav = document.querySelector(".mg-nav-inner");
          const mobileNav = document.querySelector(".mg-mobile-menu .mg-wrap");
          const contactNav = nav?.querySelector('a[href="#contacto"]');
          const contactMobile = mobileNav?.querySelector('a[href="#contacto"]');
          if (nav && !nav.querySelector(`a[href="#sec-${sec.id}"]`)) {
            const link = document.createElement("a");
            link.href = `#sec-${sec.id}`;
            link.className = "mg-nav-link";
            link.dataset.dyn = sec.id;
            link.textContent = sec.nav_label || sec.title;
            nav.insertBefore(link, contactNav);
          }
          if (mobileNav && !mobileNav.querySelector(`a[href="#sec-${sec.id}"]`)) {
            const link = document.createElement("a");
            link.href = `#sec-${sec.id}`;
            link.dataset.dyn = sec.id;
            link.textContent = sec.nav_label || sec.title;
            mobileNav.insertBefore(link, contactMobile);
          }
        }
        break;

      case "REMOVE_SECTION":
        document.querySelectorAll(`a[href="#sec-${payload.secId}"]`).forEach(a => a.remove());
        document.getElementById(`sec-${payload.secId}`)?.remove();
        break;
    }
  });
});