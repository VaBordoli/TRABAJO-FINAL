document.addEventListener('DOMContentLoaded', async () => {
  const idUsuario = requerirSesion();
  if (!idUsuario) return;

  const inputNombre = document.getElementById('nombre-usuario');
  const inputMail = document.getElementById('mail-usuario');
  const inputContra = document.getElementById('contra-usuario');

  // Son solo de lectura: se cambian desde las pantallas Editar-*
  inputNombre.readOnly = true;
  inputMail.readOnly = true;
  inputContra.readOnly = true;
  inputContra.value = '';
  inputContra.placeholder = '••••••••'; // el back nunca devuelve la contraseña

  document.getElementById('boton-circulo').addEventListener('click', () => {
    window.location.href = PAGINAS.home;
  });
  document.getElementById('cerrar-sesion').addEventListener('click', cerrarSesion);

  try {
    const r = await api('GET', '/api/auth/perfil', { query: { id_usuario: idUsuario } });
    inputNombre.value = r.usuario.nombredeusuario || '';
    inputMail.value = r.usuario.email || '';
  } catch (err) {
    alert(err.message);
    if (err.status === 404) cerrarSesion();
  }

  // ---- Eliminar cuenta: pop-up de confirmación ----
  const botonEliminar = document.getElementById('eliminar-cuenta');
  const modal = document.getElementById('modal-eliminar');
  const inputConfirmar = document.getElementById('contra-confirmar');
  const restablecerVisibilidad = configurarVisibilidadContrasena(
    'contra-confirmar',
    'alternar-contra-confirmar'
  );
  const mensaje = document.getElementById('mensaje-eliminar');
  const botonCancelar = document.getElementById('cancelar-eliminar');
  const botonConfirmar = document.getElementById('confirmar-eliminar');

  function abrirModal() {
    restablecerVisibilidad();
    inputConfirmar.value = '';
    mensaje.textContent = '';
    modal.hidden = false;
    inputConfirmar.focus();
  }
  function cerrarModal() {
    restablecerVisibilidad();
    modal.hidden = true;
    inputConfirmar.value = '';
  }

  botonEliminar.addEventListener('click', abrirModal);
  botonCancelar.addEventListener('click', cerrarModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
  });

  botonConfirmar.addEventListener('click', async () => {
    const ingresada = inputConfirmar.value;
    if (!ingresada) {
      mensaje.textContent = 'Ingresá tu contraseña';
      return;
    }
    try {
      await api('DELETE', '/api/auth/usuario', {
        body: { id_usuario: idUsuario, contraseña: ingresada }
      });
      localStorage.removeItem(CLAVE_SESION);
      window.location.href = PAGINAS.bienvenida;
    } catch (err) {
      mensaje.textContent = err.status === 401 ? 'La contraseña no coincide' : err.message;
    }
  });
});