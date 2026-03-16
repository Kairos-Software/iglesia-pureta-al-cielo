/* ========================================================
   editor_dispositivos.js
   Módulo para los botones de cambio de dispositivo (desktop/tablet/mobile)
   ======================================================== */

export function initDispositivos() {
    const iframeWrap = document.getElementById("epIframeContainer");
    if (!iframeWrap) return;

    document.querySelectorAll(".ep-device-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".ep-device-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            iframeWrap.dataset.device = btn.dataset.device;
        });
    });
}