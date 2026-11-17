document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const itemsParam = params.get('items');

  const linkRegresar = document.getElementById('link-regresar');
  if (itemsParam) {
      const regresoParams = new URLSearchParams();
      regresoParams.set('items', itemsParam);
      linkRegresar.href = 'Home.html?' + regresoParams.toString();
  }

  // ---- Eliminar cuenta: pop-up de confirmación ----
  const botonEliminar  = document.getElementById('eliminar-cuenta');
  const modal          = document.getElementById('modal-eliminar');
  const inputConfirmar = document.getElementById('contra-confirmar');
  const mensaje        = document.getElementById('mensaje-eliminar');
  const botonCancelar  = document.getElementById('cancelar-eliminar');
  const botonConfirmar = document.getElementById('confirmar-eliminar');

  function abrirModal() {
      inputConfirmar.value = '';
      mensaje.textContent = '';
      modal.hidden = false;
      inputConfirmar.focus();
  }

  function cerrarModal() {
      modal.hidden = true;
      inputConfirmar.value = '';
  }

  botonEliminar.addEventListener('click', abrirModal);
  botonCancelar.addEventListener('click', cerrarModal);

  // cerrar si se hace clic fuera de la caja
  modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrarModal();
  });

  botonConfirmar.addEventListener('click', () => {
      const ingresada = inputConfirmar.value.trim();
      // CAMBIAR ESTA LÍNEA cuando el back entregue la contraseña real
      const real = document.getElementById('contra-usuario').value.trim();

      if (real !== '' && ingresada === real) {
          mensaje.textContent = '';
          // acá el back se encargará de eliminar la cuenta
          console.log('Contraseña correcta: acá va la eliminación de la cuenta');
      } else {
          mensaje.textContent = 'La contraseña no coincide';
      }
  });
});