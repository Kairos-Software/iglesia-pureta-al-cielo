/* ========================================================
   editor_pestanas.js
   Maneja la activación de las pestañas del panel del editor.
   Escucha clics en los botones con clase .ep-tab y muestra
   el contenido correspondiente (.ep-tab-content).
   ======================================================== */

export function initPestanas() {
    document.querySelectorAll(".ep-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            // Desactivar todas las pestañas y contenidos
            document.querySelectorAll(".ep-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".ep-tab-content").forEach(c => c.classList.remove("active"));

            // Activar la pestaña clickeada
            tab.classList.add("active");

            // Mostrar el contenido asociado
            const content = document.querySelector(`[data-tab-content="${tab.dataset.tab}"]`);
            if (content) content.classList.add("active");
        });
    });
}