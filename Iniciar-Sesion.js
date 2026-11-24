document.addEventListener("DOMContentLoaded", function () {
  configurarVisibilidadContrasena("contra", "alternar-contra");
  const [inputUsuario, inputContra] = document.querySelectorAll(".franquito");
  const botonContinuar = document.querySelector(".enlace-boton-chico");

  botonContinuar.addEventListener("click", async function (e) {
    e.preventDefault();
    const usuario = inputUsuario.value.trim();
    const contra = inputContra.value;
    if (!usuario || !contra) {
      alert("Completá usuario y contraseña");
      return;
    }
    try {
      const r = await api("POST", "/api/auth/login", {
        body: { email_o_usuario: usuario, contraseña: contra }
      });
      guardarSesion(r.id_usuario);
      window.location.href = PAGINAS.home;
    } catch (err) {
      alert(err.message);
    }
  });
});