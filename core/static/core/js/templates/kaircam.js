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
            ".kc-stat, .kc-contact-card, .kc-about-body, .ds-card, .dynamic-section"
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
});