document.addEventListener("DOMContentLoaded", function () {
  const botonContinuar = document.querySelector(".enlace-boton-chico");

  botonContinuar.addEventListener("click", async function (e) {
    e.preventDefault();
    const email = document.getElementById("mail").value.trim();
    const nombredeusuario = document.getElementById("nUsuario").value.trim();
    const contraseña = document.getElementById("contra").value;
    if (!email || !nombredeusuario || !contraseña) {
      alert("Completá mail, usuario y contraseña");
      return;
    }
    try {
      const r = await api("POST", "/api/auth/registro", {
        body: { email, nombredeusuario, contraseña }
      });
      guardarSesion(r.id_usuario);
      window.location.href = PAGINAS.home;
    } catch (err) {
      alert(err.message);
    }
  });
});