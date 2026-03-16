/* ========================================================
   editor_principal.js
   Punto de entrada del editor. Inicializa el estado global,
   configura referencias, y llama a los módulos.
   ======================================================== */

import { 
    setIframe, postMessage, toast, getCookie, bindUpload, 
    actualizarPreviewImagen, ocultarIframe, mostrarIframeConRetraso,
    guardarConfig, mostrarOverlayCarga, ocultarOverlayCarga
} from './editor_utilidades.js';
import { initPestanas } from './editor_pestanas.js';
import { initInputs } from './modulos/editor_inputs.js';
import { initDispositivos } from './modulos/editor_dispositivos.js';
import { initPlantillas } from './modulos/editor_plantillas.js';
import { initIdentidad } from './modulos/editor_identidad.js';
import { initHero } from './modulos/editor_hero.js';
import { initNosotros } from './modulos/editor_nosotros.js';
import { initEstilo } from './modulos/editor_estilo.js';
import { initSecciones } from './modulos/editor_secciones.js';
import { initContacto } from './modulos/editor_contacto.js';
import { initRedes } from './modulos/editor_redes.js';
import { initEventos } from './modulos/editor_eventos.js';
import { initAnuncios } from './modulos/editor_anuncios.js';
import { initSeo } from './modulos/editor_seo.js';
import { initPie } from './modulos/editor_pie.js';
import { initAvanzado, pushHistory, deshacer, rehacer } from './modulos/editor_avanzado.js';

export let config = {};
export let iframe, iframeWrap, saveBtn, resetBtn, reloadBtn;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Editor principal cargado");

    try {
        config = JSON.parse(document.getElementById("epConfigData")?.textContent || "{}");
    } catch(e) {
        config = {};
    }
    if (!Array.isArray(config.dynamic_sections)) config.dynamic_sections = [];
    if (!Array.isArray(config.events))           config.events = [];
    if (!Array.isArray(config.ads))              config.ads = [];
    if (!Array.isArray(config.footer_links))     config.footer_links = [];

    iframe     = document.getElementById("epPreviewIframe");
    iframeWrap = document.getElementById("epIframeContainer");
    saveBtn    = document.getElementById("epSaveBtn");
    resetBtn   = document.getElementById("epResetBtn");
    reloadBtn  = document.getElementById("epReloadBtn");

    setIframe(iframe);
    iframe?.addEventListener("load", () => {
        console.log("Iframe cargado, enviando INIT_CONFIG");
        ocultarOverlayCarga();
        setTimeout(() => postMessage("INIT_CONFIG", config), 300);
    });

    initPestanas();
    initInputs();
    initDispositivos();

    // Logo
    bindUpload(
        "epLogoUpload",
        "logo_url",
        "epLogoPrevWrap",
        (url) => {
            config.logo_url = url;
            pushHistory("Logo actualizado");
        },
        () => {
            config.logo_url = "";
            pushHistory("Logo eliminado");
        },
        config.logo_url
    );

    // Hero background
    bindUpload(
        "epHeroBgUpload",
        "hero_bg_url",
        "epHeroBgPreview",
        (url) => {
            config.hero_bg_url = url;
            pushHistory("Imagen de fondo actualizada");
        },
        () => {
            config.hero_bg_url = "";
            pushHistory("Imagen de fondo eliminada");
        },
        config.hero_bg_url
    );

    // About imagen
    bindUpload(
        "epAboutImgUpload",
        "about_img_url",
        "epAboutImgPreview",
        (url) => {
            config.about_img_url = url;
            pushHistory("Imagen 'Nosotros' actualizada");
        },
        () => {
            config.about_img_url = "";
            pushHistory("Imagen 'Nosotros' eliminada");
        },
        config.about_img_url
    );

    // OG imagen
    bindUpload(
        "epOgImgUpload",
        "og_img_url",
        "epOgImgPreview",
        (url) => {
            config.og_img_url = url;
            pushHistory("Imagen OG actualizada");
        },
        () => {
            config.og_img_url = "";
            pushHistory("Imagen OG eliminada");
        },
        config.og_img_url
    );

    // +++ NUEVO: Player poster image +++
    bindUpload(
        "epPlayerPosterUpload",
        "player_poster_url",
        "epPlayerPosterPreview",
        (url) => {
            config.player_poster_url = url;
            pushHistory("Imagen del reproductor actualizada");
        },
        () => {
            config.player_poster_url = "";
            pushHistory("Imagen del reproductor eliminada");
        },
        config.player_poster_url
    );

    document.getElementById("epUndoBtn")?.addEventListener("click", deshacer);
    document.getElementById("epRedoBtn")?.addEventListener("click", rehacer);

    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                deshacer();
            } else if (e.key === 'y') {
                e.preventDefault();
                rehacer();
            }
        }
    });

    saveBtn?.addEventListener("click", async () => {
        pushHistory("Guardado manual");
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span> Guardando...`;
        const ok = await guardarConfig(config);
        if (ok) {
            toast("Cambios guardados");
        } else {
            toast("⚠️ Error al guardar");
        }
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span class="material-symbols-outlined">check</span> Guardar`;
    });

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
        }
    });

    reloadBtn?.addEventListener("click", () => {
        if (iframe) {
            mostrarOverlayCarga();
            iframe.src = iframe.src.split('?')[0] + '?t=' + Date.now();
        }
    });

    initPlantillas();
    initIdentidad();
    initHero();
    initNosotros();
    initEstilo();
    initSecciones();
    initContacto();
    initRedes();
    initEventos();
    initAnuncios();
    initSeo();
    initPie();
    initAvanzado();

    import('./modulos/editor_seo.js').then(m => m.updateSeoPreview?.());

    // Actualizar previews de imágenes al restaurar estado
    function actualizarPreviewsGlobales() {
        const previews = [
            { id: 'epLogoPrevWrap', key: 'logo_url' },
            { id: 'epHeroBgPreview', key: 'hero_bg_url' },
            { id: 'epAboutImgPreview', key: 'about_img_url' },
            { id: 'epOgImgPreview', key: 'og_img_url' },
            { id: 'epPlayerPosterPreview', key: 'player_poster_url' } // <-- AÑADIDO
        ];
        previews.forEach(p => {
            const wrap = document.getElementById(p.id);
            if (wrap) {
                actualizarPreviewImagen(wrap, config[p.key] || '', p.key);
            }
        });
    }
    window.addEventListener('editor:estadoRestaurado', actualizarPreviewsGlobales);
});