// ---------- Campos numéricos (humedad / temperatura) ----------
// - Sin negativos
// - Sufijo fijo (% o °C)
// - Humedad máx 100 (data-max)
// - Si el valor es 0, se vuelve a ver el nombre (placeholder)

function valorNumerico(input) {
  const n = parseInt(input.value.replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function mostrar(input, n) {
  const max = input.dataset.max ? Number(input.dataset.max) : Infinity;
  n = Math.max(0, Math.min(n, max));

  if (n > 0) {
    input.value = n + input.dataset.sufijo;
  } else {
    input.value = '';   // vuelve a mostrar el placeholder
  }
  return n;
}

document.querySelectorAll('.campo-num').forEach(function (input) {
  input.addEventListener('input', function () {
    const n = mostrar(input, valorNumerico(input));
    if (n > 0) {
      // cursor antes del símbolo
      const pos = String(n).length;
      input.setSelectionRange(pos, pos);
    }
  });
});

// ---------- Botones − y + ----------
document.querySelectorAll('button[data-target]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const input = document.getElementById(btn.dataset.target);
    const paso = Number(btn.dataset.paso);
    mostrar(input, valorNumerico(input) + paso);
  });
});

// ---------- Agregar parcela y volver a Home ----------
const form = document.getElementById('form-agregar');
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const leer = (id) => valorNumerico(document.getElementById(id)); // número limpio, sin % ni °C

  const nombreParcela = document.getElementById('nombre-parcela').value;
  localStorage.setItem("Nombre Parcela", nombreParcela);

  const nroSensor = document.getElementById("nSensor").value;
  localStorage.setItem(`${nombreParcela}: Nombre Sensor`, nroSensor);

  localStorage.setItem(`${nombreParcela}: Valor Humedad`, leer('humedad'));
  localStorage.setItem(`${nombreParcela}: Humedad Min`, leer('humedad-min'));
  localStorage.setItem(`${nombreParcela}: Humedad Max`, leer('humedad-max'));

  localStorage.setItem(`${nombreParcela}: Valor Temperatura`, leer('temperatura'));
  localStorage.setItem(`${nombreParcela}: Temperatura Min`, leer('temperatura-min'));
  localStorage.setItem(`${nombreParcela}: Temperatura Max`, leer('temperatura-max'));

  const urlParams = new URLSearchParams(window.location.search);
  const itemsParam = urlParams.get('items');
  const itemsExistentes = itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : [];

  itemsExistentes.push({ parcela: nombreParcela });

  const params = new URLSearchParams();
  params.set('items', encodeURIComponent(JSON.stringify(itemsExistentes)));

  window.location.href = 'Home.html?' + params.toString();
});