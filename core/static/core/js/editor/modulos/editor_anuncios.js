/* ========================================================
   editor_anuncios.js
   Módulo para la pestaña "Anuncios".
   Gestión de banners, sponsors y avisos.
   ======================================================== */

import { config } from '../editor_principal.js';
import { postMessage, toast, esc, getCookie } from '../editor_utilidades.js';
import { pushHistory } from './editor_avanzado.js';

let selectedAdType = "banner";
let adBannerImgUrl = "", adSponsorLogoUrl = "";

const AD_TYPE_ICONS  = { banner: "panorama", sponsor: "workspace_premium", notice: "notifications" };
const AD_TYPE_LABELS = { banner: "Banner",   sponsor: "Sponsor",           notice: "Aviso" };

export function initAnuncios() {
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

    document.getElementById("epAdBannerUpload")?.addEventListener("change", async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const fd = new FormData();
        fd.append("image", file); fd.append("key", "ad_banner_temp");
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            const res = await fetch("/editor/upload-imagen/", { method: "POST", body: fd });
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
            const res = await fetch("/editor/upload-imagen/", { method: "POST", body: fd });
            const data = await res.json();
            if (data.ok && data.url) {
                adSponsorLogoUrl = data.url;
                const prev = document.getElementById("epAdSponsorLogoPreview");
                if (prev) prev.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:contain;padding:4px">`;
            } else { toast("⚠️ " + (data.error || "Error")); }
        } catch(err) { toast("⚠️ Error de conexión"); }
        e.target.value = "";
    });

    const adNoticeBgColor = document.getElementById("epAdNoticeBgColor");
    const adNoticeBgColorText = document.getElementById("epAdNoticeBgColorText");
    adNoticeBgColor?.addEventListener("input", () => {
        if (adNoticeBgColorText) adNoticeBgColorText.value = adNoticeBgColor.value;
    });
    adNoticeBgColorText?.addEventListener("input", () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(adNoticeBgColorText.value) && adNoticeBgColor)
            adNoticeBgColor.value = adNoticeBgColorText.value;
    });

    document.getElementById("epAddAdBtn")?.addEventListener("click", agregarAnuncio);

    renderAds();

    window.addEventListener('editor:estadoRestaurado', renderAds);
}

function agregarAnuncio() {
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
        ad.bg_color = document.getElementById("epAdNoticeBgColor")?.value || "#c9a84c";
        ["epAdNoticeTitle","epAdNoticeText"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    }

    config.ads.push(ad);
    postMessage("UPDATE_FIELD", { key: "ads", value: config.ads });
    renderAds();
    pushHistory("Anuncio agregado");
    toast("Anuncio agregado ✓");
}

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
            postMessage("UPDATE_FIELD", { key: "ads", value: config.ads });
            renderAds();
            pushHistory("Anuncio eliminado");
        });
        list.appendChild(item);
    });
}