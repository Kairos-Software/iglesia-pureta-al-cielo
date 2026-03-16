/* ========================================================
   editor_avanzado.js
   Módulo para la pestaña "Avanzado" y funciones globales de historial.
   Historial con deshacer/rehacer (índice), export/import, presets, mantenimiento.
   Cada acción individual se registra en el historial.
   ======================================================== */

import { config } from '../editor_principal.js';
import { postMessage, toast, esc, getCookie, guardarConfig } from '../editor_utilidades.js';

const HISTORY_MAX = 50;
let historyStack = [];
let currentIndex = -1;

const PRESETS_KEY = "ep_custom_presets";

export function initAvanzado() {
    console.log("initAvanzado llamado");
    pushInitialState();

    // Historial inmediato para todos los inputs con data-key (excepto file)
    document.querySelectorAll("input[data-key]:not([type='file']), select[data-key], textarea[data-key]").forEach(inp => {
        inp.addEventListener("input", () => {
            pushHistory("Edición de campo");
        });
        inp.addEventListener("change", () => {
            pushHistory("Cambio en selección");
        });
    });

    document.getElementById("epExportJsonBtn")?.addEventListener("click", exportarJson);
    document.getElementById("epImportJsonBtn")?.addEventListener("click", () => {
        document.getElementById("epImportJsonInput")?.click();
    });
    document.getElementById("epImportJsonInput")?.addEventListener("change", importarJson);

    document.getElementById("epSavePresetBtn")?.addEventListener("click", guardarPreset);
    renderPresets();

    const maintenanceToggle = document.getElementById("epMaintenanceToggle");
    const maintenanceWarning = document.getElementById("epMaintenanceWarning");
    if (maintenanceToggle) {
        maintenanceToggle.addEventListener("change", () => {
            const active = maintenanceToggle.checked;
            config.maintenance_mode = active;
            postMessage("UPDATE_FIELD", { key: "maintenance_mode", value: active });
            if (maintenanceWarning) {
                maintenanceWarning.style.display = active ? "flex" : "none";
            }
            pushHistory("Cambio modo mantenimiento");
        });
    }

    renderHistory();
}

function pushInitialState() {
    historyStack = [JSON.parse(JSON.stringify(config))];
    currentIndex = 0;
    renderHistory();
}

export function pushHistory(label = "Cambio") {
    console.log("pushHistory llamado con label:", label, "currentIndex antes:", currentIndex, "historyStack length:", historyStack.length);
    if (currentIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, currentIndex + 1);
    }
    const newState = JSON.parse(JSON.stringify(config));
    historyStack.push(newState);
    if (historyStack.length > HISTORY_MAX) {
        historyStack.shift();
        if (currentIndex > 0) currentIndex--;
    }
    currentIndex = historyStack.length - 1;
    console.log("pushHistory: nuevo currentIndex:", currentIndex, "nuevo historyStack length:", historyStack.length);
    renderHistory();
}

export function deshacer() {
    console.log("deshacer llamado, currentIndex:", currentIndex);
    if (currentIndex > 0) {
        currentIndex--;
        restaurarEstado(historyStack[currentIndex], "Deshacer");
    } else {
        toast("No hay acciones para deshacer");
    }
}

export function rehacer() {
    console.log("rehacer llamado, currentIndex:", currentIndex);
    if (currentIndex < historyStack.length - 1) {
        currentIndex++;
        restaurarEstado(historyStack[currentIndex], "Rehacer");
    } else {
        toast("No hay acciones para rehacer");
    }
}

function restaurarEstado(estado, origen = "Restaurar") {
    Object.assign(config, estado);
    document.querySelectorAll("[data-key]").forEach(inp => {
        const k = inp.dataset.key;
        if (config[k] !== undefined) {
            if (inp.type === 'checkbox') {
                inp.checked = config[k];
            } else if (inp.type === 'color') {
                inp.value = config[k];
            } else {
                inp.value = config[k];
            }
        }
    });
    postMessage("INIT_CONFIG", config);
    toast(`${origen} realizado`);
    renderHistory();
    window.dispatchEvent(new CustomEvent('editor:estadoRestaurado', { detail: { origen } }));
    // Guardar en servidor para sincronizar con futuras recargas
    guardarConfig(config).catch(err => console.warn("Error guardando tras restaurar:", err));
}

function renderHistory() {
    const list = document.getElementById("epHistoryList");
    const empty = document.getElementById("epHistoryEmpty");
    if (!list) return;
    if (historyStack.length === 0) {
        list.innerHTML = "";
        if (empty) empty.style.display = "";
        return;
    }
    if (empty) empty.style.display = "none";
    list.innerHTML = historyStack.map((_, idx) => {
        const time = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        let label = "";
        if (idx === currentIndex) label = "🟢 Actual";
        else if (idx < currentIndex) label = "↩ Anterior";
        else label = "↪ Futuro";
        return `
            <div class="ep-history-item ${idx === currentIndex ? 'active' : ''}" data-hidx="${idx}">
                <span class="ep-history-time">${time}</span>
                <span class="ep-history-label">${label}</span>
                <span class="ep-history-restore">
                    <span class="material-symbols-outlined">restore</span> Restaurar
                </span>
            </div>`;
    }).join("");

    list.querySelectorAll(".ep-history-item").forEach(el => {
        el.addEventListener("click", () => {
            const idx = parseInt(el.dataset.hidx);
            if (idx === currentIndex) return;
            if (confirm("¿Restaurar al estado seleccionado?")) {
                currentIndex = idx;
                restaurarEstado(historyStack[idx], "Restauración manual");
            }
        });
    });
}

function exportarJson() {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const name = (config.org_name || "config").replace(/\s+/g, "_").toLowerCase();
    a.href = url; a.download = `${name}_config.json`; a.click();
    URL.revokeObjectURL(url);
    toast("Configuración exportada");
}

function importarJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const imported = JSON.parse(ev.target.result);
            if (typeof imported !== "object" || Array.isArray(imported)) throw new Error("Formato inválido");
            pushHistory("Antes de importar");
            Object.assign(config, imported);
            document.querySelectorAll("[data-key]").forEach(inp => {
                const k = inp.dataset.key;
                if (config[k] !== undefined) {
                    if (inp.type === 'checkbox') {
                        inp.checked = config[k];
                    } else {
                        inp.value = config[k];
                    }
                }
            });
            postMessage("INIT_CONFIG", config);
            window.dispatchEvent(new CustomEvent('editor:estadoRestaurado'));
            toast("Configuración importada");
        } catch(err) {
            toast("⚠️ Archivo JSON inválido");
        }
    };
    reader.readAsText(file);
    e.target.value = "";
}

function loadStoredPresets() {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]"); } catch(e) { return []; }
}
function saveStoredPresets(p) { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); }

function renderPresets() {
    const list = document.getElementById("epPresetsList");
    if (!list) return;
    const presets = loadStoredPresets();
    if (presets.length === 0) {
        list.innerHTML = `<p style="font-size:12px;color:var(--ep-text-muted);text-align:center;padding:8px 0">Sin presets guardados</p>`;
        return;
    }
    list.innerHTML = presets.map((p, i) => `
        <div class="ep-preset-item">
            <span class="ep-preset-name">${esc(p.name)}</span>
            <span class="ep-preset-date">${p.date}</span>
            <button class="ep-preset-load" data-pidx="${i}">Cargar</button>
            <button class="ep-preset-del" data-pidx="${i}">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>`).join("");

    list.querySelectorAll(".ep-preset-load").forEach(btn => {
        btn.addEventListener("click", () => {
            const p = loadStoredPresets()[parseInt(btn.dataset.pidx)];
            if (!p || !confirm(`¿Cargar preset "${p.name}"?`)) return;
            pushHistory("Antes de cargar preset");
            Object.assign(config, p.data);
            document.querySelectorAll("[data-key]").forEach(inp => {
                const k = inp.dataset.key;
                if (config[k] !== undefined) {
                    if (inp.type === 'checkbox') {
                        inp.checked = config[k];
                    } else {
                        inp.value = config[k];
                    }
                }
            });
            postMessage("INIT_CONFIG", config);
            window.dispatchEvent(new CustomEvent('editor:estadoRestaurado'));
            toast(`Preset "${p.name}" cargado`);
        });
    });

    list.querySelectorAll(".ep-preset-del").forEach(btn => {
        btn.addEventListener("click", () => {
            const presets = loadStoredPresets();
            presets.splice(parseInt(btn.dataset.pidx), 1);
            saveStoredPresets(presets);
            renderPresets();
            toast("Preset eliminado");
        });
    });
}

function guardarPreset() {
    const nameInp = document.getElementById("epPresetName");
    const name = nameInp?.value?.trim();
    if (!name) { toast("⚠️ Escribí un nombre para el preset"); return; }
    const presets = loadStoredPresets();
    presets.unshift({ name, date: new Date().toLocaleDateString("es-AR"), data: JSON.parse(JSON.stringify(config)) });
    if (presets.length > 20) presets.pop();
    saveStoredPresets(presets);
    if (nameInp) nameInp.value = "";
    renderPresets();
    toast(`Preset "${name}" guardado`);
}