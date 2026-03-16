/* ========================================================
   editor_eventos.js
   Módulo para la pestaña "Eventos".
   Creación, edición y eliminación de eventos.
   Con soporte completo para deshacer/rehacer.
   ======================================================== */

import { config } from '../editor_principal.js';
import { postMessage, toast, esc, getCookie } from '../editor_utilidades.js';
import { pushHistory } from './editor_avanzado.js';

let evtHasBtnToggle, evtBtnFields, evtImgUrl = "";

export function initEventos() {
    evtHasBtnToggle = document.getElementById("epEvtHasBtn");
    evtBtnFields = document.querySelector(".ep-evt-btn-fields");

    evtHasBtnToggle?.addEventListener("change", () => {
        if (evtBtnFields) evtBtnFields.style.display = evtHasBtnToggle.checked ? "block" : "none";
    });

    document.getElementById("epEvtImgBtn")?.addEventListener("click", () => {
        document.getElementById("epEvtImgUpload")?.click();
    });

    document.getElementById("epEvtImgUpload")?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const preview = document.getElementById("epEvtImgPreview");
        const fd = new FormData();
        fd.append("image", file);
        const uniqueKey = `evt_img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        fd.append("key", uniqueKey);
        fd.append("csrfmiddlewaretoken", getCookie("csrftoken"));
        try {
            const res = await fetch("/editor/upload-imagen/", { method: "POST", body: fd });
            const data = await res.json();
            if (data.ok && data.url) {
                evtImgUrl = data.url;
                if (preview) preview.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:cover">`;
            } else {
                toast("⚠️ " + (data.error || "Error"));
            }
        } catch(err) {
            toast("⚠️ Error de conexión");
        }
        e.target.value = "";
    });

    document.getElementById("epAddEventBtn")?.addEventListener("click", agregarEvento);

    renderEvents();

    window.addEventListener('editor:estadoRestaurado', () => {
        console.log("Eventos: estado restaurado, re-renderizando");
        renderEvents();
    });
}

function agregarEvento() {
    const name = document.getElementById("epEvtName")?.value?.trim();
    if (!name) { toast("⚠️ El evento necesita un nombre"); return; }

    const ev = {
        id:       "evt_" + Date.now(),
        name,
        desc:     document.getElementById("epEvtDesc")?.value    || "",
        date:     document.getElementById("epEvtDate")?.value     || "",
        time:     document.getElementById("epEvtTime")?.value     || "",
        place:    document.getElementById("epEvtPlace")?.value    || "",
        has_btn:  evtHasBtnToggle?.checked || false,
        btn_text: document.getElementById("epEvtBtnText")?.value  || "Inscribirse",
        btn_url:  document.getElementById("epEvtBtnUrl")?.value   || "#",
        img_url:  evtImgUrl || "",
    };

    config.events.push(ev);
    // Actualizar la preview inmediatamente
    postMessage("UPDATE_FIELD", { key: "events", value: config.events });
    renderEvents();
    pushHistory("Evento agregado");

    // Limpiar formulario
    ["epEvtName","epEvtDesc","epEvtDate","epEvtTime","epEvtPlace","epEvtBtnText","epEvtBtnUrl"].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = "";
    });
    evtImgUrl = "";
    const evtPreview = document.getElementById("epEvtImgPreview");
    if (evtPreview) evtPreview.innerHTML = `<div class="ep-img-empty"><span class="material-symbols-outlined">image</span><span>Sin imagen</span></div>`;
    if (evtHasBtnToggle) evtHasBtnToggle.checked = false;
    if (evtBtnFields) evtBtnFields.style.display = "none";
    toast("Evento agregado ✓");
}

function renderEvents() {
    const list = document.getElementById("epEventsList");
    if (!list) return;
    if (config.events.length === 0) {
        list.innerHTML = `<p style="font-size:12px;color:var(--ep-text-muted);text-align:center;padding:12px 0">Sin eventos agregados</p>`;
        return;
    }
    list.innerHTML = "";
    config.events.forEach((ev, i) => {
        const item = document.createElement("div");
        item.className = "ep-event-item";
        item.dataset.eventId = ev.id;
        const dateStr = ev.date
            ? new Date(ev.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })
            : "Sin fecha";
        item.innerHTML = `
            <div class="ep-event-header">
                <span class="ep-event-date-badge">${dateStr}</span>
                <span class="ep-event-name">${esc(ev.name || "Evento")}</span>
                <span class="material-symbols-outlined ep-event-toggle">expand_more</span>
            </div>
            <div class="ep-event-body">
                <div class="ep-event-info">
                    ${ev.date  ? `<div class="ep-event-info-row"><span class="material-symbols-outlined">calendar_month</span>${dateStr}${ev.time ? " · " + ev.time : ""}</div>` : ""}
                    ${ev.place ? `<div class="ep-event-info-row"><span class="material-symbols-outlined">location_on</span>${esc(ev.place)}</div>` : ""}
                    ${ev.desc  ? `<div class="ep-event-info-row"><span class="material-symbols-outlined">info</span>${esc(ev.desc)}</div>` : ""}
                </div>
                <div class="ep-dyn-actions">
                    <button class="ep-dyn-del-sec ep-evt-del" data-evidx="${i}">
                        <span class="material-symbols-outlined">delete</span> Eliminar evento
                    </button>
                </div>
            </div>`;
        item.querySelector(".ep-event-header").addEventListener("click", () => item.classList.toggle("open"));
        item.querySelector(".ep-evt-del").addEventListener("click", () => {
            config.events.splice(i, 1);
            postMessage("UPDATE_FIELD", { key: "events", value: config.events });
            renderEvents();
            pushHistory("Evento eliminado");
        });
        list.appendChild(item);
    });
}