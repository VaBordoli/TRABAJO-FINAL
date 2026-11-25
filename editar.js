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
(async function () {
  const idUsuario = requerirSesion();
  if (!idUsuario) return;

  const params = new URLSearchParams(window.location.search);
  const idCampo = params.get('id');
  const irHome = () => { window.location.href = PAGINAS.home; };
  if (!idCampo) {
    irHome();
    return;
  }

  const inputNombre = document.getElementById('nombre-parcela');
  const inputSensor = document.getElementById('nSensor');
  const botonCirculo = document.getElementById('boton-circulo');
  if (botonCirculo) botonCirculo.addEventListener('click', irHome);

  let campo;
  try {
    campo = (await listarCampos()).find(c => String(c.id) === idCampo);
  } catch (err) {
    alert(err.message);
    return;
  }
  if (!campo) {
    alert('El campo no existe');
    irHome();
    return;
  }

  inputNombre.value = campo.nombre;
  inputSensor.value = campo.id_dispositivo;
  inputSensor.readOnly = true;

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
  validarLimites();

  document.getElementById('form-editar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevoNombre = inputNombre.value.trim();
    if (nuevoNombre === '') {
      alert('Completá el nombre del campo');
      inputNombre.focus();
      return;
    }
    if (!validarLimites()) {
      e.currentTarget.reportValidity();
      return;
    }
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