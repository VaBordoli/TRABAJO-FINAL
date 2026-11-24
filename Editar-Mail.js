document.addEventListener('DOMContentLoaded', () => {
  configurarVisibilidadContrasena('intro-contra', 'alternar-intro-contra');
  configurarEdicionUsuario({
    dato: 'email',
    idNuevo: 'nuevo-mail',
    idConfirmar: 'confir-mail',
    idContraActual: 'intro-contra'
  });
});