const params = new URLSearchParams(window.location.search);
const nombreOriginal = params.get('parcela') || '';
const itemsParam = params.get('items');
const items = itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : [];

if (itemsParam) {
  const regresoParams = new URLSearchParams();
  regresoParams.set('items', itemsParam);
  document.getElementById('link-regresar').href = 'Home.html?' + regresoParams.toString();
}

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

const CAMPOS = [
  { id: 'humedad',         clave: 'Valor Humedad' },
  { id: 'humedad-min',     clave: 'Humedad Min' },
  { id: 'humedad-max',     clave: 'Humedad Max' },
  { id: 'temperatura',     clave: 'Valor Temperatura' },
  { id: 'temperatura-min', clave: 'Temperatura Min' },
  { id: 'temperatura-max', clave: 'Temperatura Max' },
  { id: 'corriente',       clave: 'Valor Corriente' },
  { id: 'corriente-min',   clave: 'Corriente Min' },
  { id: 'corriente-max',   clave: 'Corriente Max' }
];

document.getElementById('nombre-parcela').value = nombreOriginal;
document.getElementById('nSensor').value =
  localStorage.getItem(`${nombreOriginal}: Nombre Sensor`) || '';

CAMPOS.forEach(({ id, clave }) => {
  const guardado = parseFloat(localStorage.getItem(`${nombreOriginal}: ${clave}`));
  mostrar(document.getElementById(id), Number.isFinite(guardado) ? guardado : 0);
});

document.getElementById('form-editar').addEventListener('submit', (e) => {
  e.preventDefault();

  const nuevoNombre = document.getElementById('nombre-parcela').value.trim();
  if (nuevoNombre === '') return;

  const cambioNombre = nuevoNombre !== nombreOriginal;

  if (cambioNombre && items.some(i => i.parcela === nuevoNombre)) {
    alert('Ya existe una parcela con ese nombre');
    return;
  }

  const sensor = localStorage.getItem(`${nombreOriginal}: Nombre Sensor`) || '';
  localStorage.setItem(`${nuevoNombre}: Nombre Sensor`, sensor);

  CAMPOS.forEach(({ id, clave }) => {
    localStorage.setItem(`${nuevoNombre}: ${clave}`, valorNumerico(document.getElementById(id)));
  });

  if (cambioNombre) {
    localStorage.removeItem(`${nombreOriginal}: Nombre Sensor`);
    CAMPOS.forEach(({ clave }) => localStorage.removeItem(`${nombreOriginal}: ${clave}`));

    const item = items.find(i => i.parcela === nombreOriginal);
    if (item) item.parcela = nuevoNombre;
  }

  const nuevosParams = new URLSearchParams();
  nuevosParams.set('items', encodeURIComponent(JSON.stringify(items)));
  window.location.href = 'Home.html?' + nuevosParams.toString();
});