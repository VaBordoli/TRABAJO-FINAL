// Pantalla "Editar campo"
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
document.querySelectorAll('button[data-target]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const input = document.getElementById(btn.dataset.target);
    mostrar(input, valorNumerico(input) + Number(btn.dataset.paso));
  });
});

(async function () {
  const idUsuario = requerirSesion();
  if (!idUsuario) return;

  const params = new URLSearchParams(window.location.search);
  const idCampo = params.get('id');
  const irHome = () => { window.location.href = PAGINAS.home; };
  if (!idCampo) { irHome(); return; }

  const inputNombre = document.getElementById('nombre-parcela');
  const inputSensor = document.getElementById('nSensor');
  const botonCirculo = document.getElementById('boton-circulo');
  if (botonCirculo) botonCirculo.addEventListener('click', irHome);

  // Datos del campo (nombre y sensor) desde el back
  let campo;
  try {
    campo = (await listarCampos()).find(c => String(c.id) === idCampo);
  } catch (err) {
    alert(err.message);
    return;
  }
  if (!campo) { alert('El campo no existe'); irHome(); return; }

  inputNombre.value = campo.nombre;
  inputSensor.value = campo.id_dispositivo;
  inputSensor.readOnly = true; // el back no permite cambiar el sensor de un campo

  // Rangos configurados (corriente del front = conductividad del back)
  const MAPA = [
    ['humedad-min', 'humedad', 'valorminimo'],
    ['humedad-max', 'humedad', 'valormaximo'],
    ['temperatura-min', 'temperatura', 'valorminimo'],
    ['temperatura-max', 'temperatura', 'valormaximo'],
    ['corriente-min', 'conductividad', 'valorminimo'],
    ['corriente-max', 'conductividad', 'valormaximo']
  ];
  try {
    const rangos = await pedirRangos(campo.id);
    if (rangos) {
      MAPA.forEach(([id, tipo, lado]) => {
        mostrar(document.getElementById(id), Number(rangos[tipo][lado]) || 0);
      });
    }
  } catch (err) {
    console.error(err);
  }

  // Valores actuales: solo lectura (los manda el sensor)
  try {
    const actual = await pedirValorActual(campo.id_dispositivo);
    [['humedad', actual.humedad], ['temperatura', actual.temperatura], ['corriente', actual.corriente]]
      .forEach(([id, valor]) => {
        const input = document.getElementById(id);
        mostrar(input, Math.round(Number(valor)) || 0);
        input.readOnly = true;
        document.querySelectorAll(`button[data-target="${id}"]`).forEach(b => { b.disabled = true; });
      });
  } catch (err) {
    console.error(err);
  }

  document.getElementById('form-editar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevoNombre = inputNombre.value.trim();
    if (nuevoNombre === '') return;
    const leer = (id) => valorNumerico(document.getElementById(id));

    try {
      if (nuevoNombre !== campo.nombre) {
        await api('PUT', `/api/campos/${campo.id}`, {
          query: { id_usuario: idUsuario },
          body: { nombre: nuevoNombre }
        });
      }
      await api('PUT', `/api/campos/${campo.id}/valores-predeterminados`, {
        query: { id_usuario: idUsuario },
        body: {
          humedad: { valorminimo: leer('humedad-min'), valormaximo: leer('humedad-max') },
          temperatura: { valorminimo: leer('temperatura-min'), valormaximo: leer('temperatura-max') },
          conductividad: { valorminimo: leer('corriente-min'), valormaximo: leer('corriente-max') }
        }
      });
      irHome();
    } catch (err) {
      alert(err.message);
    }
  });
})();