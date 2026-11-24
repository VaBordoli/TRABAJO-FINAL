document.addEventListener('DOMContentLoaded', () => {
  configurarVisibilidadContrasena('nueva-contra', 'alternar-nueva-contra');
  configurarVisibilidadContrasena('intro-contra', 'alternar-intro-contra');
  configurarVisibilidadContrasena('confir-contra', 'alternar-confir-contra');
  configurarEdicionUsuario({
    dato: 'contraseña',
    idNuevo: 'nueva-contra',
    idConfirmar: 'confir-contra',
    idContraActual: 'intro-contra'
  });
});