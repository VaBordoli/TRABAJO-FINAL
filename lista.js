// Pantalla "Agregar campo"
function valorNumerico(input) {
  const n = parseInt(input.value.replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
}
function mostrar(input, n) {
  const max = input.dataset.max ? Number(input.dataset.max) : Infinity;
  n = Math.max(0, Math.min(n, max));
  input.value = n > 0 ? n + input.dataset.sufijo : '';
  return n;
}
document.querySelectorAll('.campo-num').forEach(function (input) {
  input.addEventListener('input', function () {
    const n = mostrar(input, valorNumerico(input));
    if (n > 0) {
      const pos = String(n).length;
      input.setSelectionRange(pos, pos);
    }
  });
});
const idUsuario = requerirSesion();
const form = document.getElementById('form-agregar');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!idUsuario) return;

  const leer = (id) => valorNumerico(document.getElementById(id));
  const nombre = document.getElementById('nombre-parcela').value.trim();
  const sensor = document.getElementById('nSensor').value.trim();
  if (!nombre || !sensor) {
    alert('Completá el nombre del campo y el ID del sensor');
    return;
  }

  // "corriente" del front = "conductividad" del back.
  // Los "valores actuales" ya no se guardan: los trae el sensor.
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