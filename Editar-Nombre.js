document.addEventListener('DOMContentLoaded', () => {
  configurarVisibilidadContrasena('intro-contra', 'alternar-intro-contra');
  configurarEdicionUsuario({
    dato: 'nombredeusuario',
    idNuevo: 'nuevo-usuario',
    idConfirmar: 'confir-usuario',
    idContraActual: 'intro-contra'
  });
});