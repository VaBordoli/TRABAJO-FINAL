function valorNumerico(input) {
  const n = parseInt(input.value.replace(/\D/g, ''), 10);
  if (isNaN(n)) {
    return 0;
  }
  return n;
}
function mostrar(input, n) {
  let max = Infinity;
  if (input.dataset.max) {
    max = Number(input.dataset.max);
  }
  n = Math.max(0, Math.min(n, max));
  input.value = n + input.dataset.sufijo;
  return n;
}
document.querySelectorAll('.campo-num').forEach(function (input) {
  input.addEventListener('input', function () {
    const texto = input.value.replace(/\D/g, '');
    if (texto === '') {
      input.value = '';
      validarLimites();
      return;
    }

    const n = mostrar(input, parseInt(texto, 10));
    const pos = String(n).length;
    input.setSelectionRange(pos, pos);
    validarLimites();
  });
});
const idUsuario = requerirSesion();
const form = document.getElementById('form-agregar');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!idUsuario) return;
  if (!validarLimites()) {
    form.reportValidity();
    return;
  }

  const leer = (id) => valorNumerico(document.getElementById(id));
  const nombre = document.getElementById('nombre-parcela').value.trim();
  const sensor = document.getElementById('nSensor').value.trim();
  if (!nombre || !sensor) {
    alert('Completá el nombre del campo y el ID del sensor');
    return;
  }

  const body = {
    id_usuario: idUsuario,
    nombre: nombre,
    id_dispositivo: sensor,
    humedad: { valorminimo: leer('humedad-min'), valormaximo: leer('humedad-max') },
    temperatura: { valorminimo: leer('temperatura-min'), valormaximo: leer('temperatura-max') },
    conductividad: { valorminimo: leer('corriente-min'), valormaximo: leer('corriente-max') }
  };

  try {
    await api('POST', '/api/campos', { body });
    window.location.href = PAGINAS.home;
  } catch (err) {
    alert(err.message);
  }
});