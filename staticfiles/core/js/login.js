/* ═══════════════════════════════════
   LOGIN.JS — mínimo necesario
═══════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {

    const form   = document.getElementById("loginForm");
    const submit = document.getElementById("loginSubmit");

    if (form && submit) {
        form.addEventListener("submit", () => {
            submit.disabled     = true;
            submit.textContent  = "Ingresando...";
        });
    }

    // Foco automático en el campo usuario
    const usernameInput = document.getElementById("username");
    if (usernameInput) usernameInput.focus();

});