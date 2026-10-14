// ---------- Botones − y + ----------
document.querySelectorAll('button[data-target]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const input = document.getElementById(btn.dataset.target);
    const paso = Number(btn.dataset.paso);
    let actual = parseFloat(input.value);
    if (isNaN(actual)) actual = 0;

    let nuevo = Math.round(actual + paso);

    // Parcelas: solo enteros, mínimo 1
    if (input.id === 'parcelas' && nuevo < 1) nuevo = 1;

    input.value = nuevo;
  });
});

// ---------- Agregar parcela y volver a Home ----------
const form = document.getElementById('form-agregar')
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const nombreParcela = document.getElementById('nombre-parcela').value;
  localStorage.setItem("Nombre Parcela", nombreParcela)
  const nroSensor = document.getElementById("nSensor").value;
  localStorage.setItem(`${nombreParcela}: Nombre Sensor`, nroSensor)
  const valorHumedad = document.getElementById('humedad').value;
  localStorage.setItem(`${nombreParcela}: Valor Humedad`, valorHumedad)
  const valorTemperatura = document.getElementById('temperatura').value;
  localStorage.setItem( `${nombreParcela}: Valor Temperatura`, valorTemperatura)
  const valorElectricidad = document.getElementById('electricidad').value;
  localStorage.setItem(`${nombreParcela}: Valor Electricidad`, valorElectricidad)
  const urlParams = new URLSearchParams(window.location.search);
  const itemsParam = urlParams.get('items');
  const itemsExistentes = itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : [];

  itemsExistentes.push({ parcela: nombreParcela });

  const params = new URLSearchParams();
  params.set('items', encodeURIComponent(JSON.stringify(itemsExistentes)));

  window.location.href = 'Home.html?' + params.toString();
});