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

// ---------- Parcelas: solo enteros positivos ----------
const inputParcelas = document.getElementById('parcelas');

inputParcelas.addEventListener('keydown', function (e) {
  if (['.', ',', '-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
});

inputParcelas.addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});

inputParcelas.addEventListener('blur', function () {
  if (this.value !== '' && parseInt(this.value, 10) < 1) this.value = 1;
});

// ---------- Agregar parcela y volver a Home ----------
document.getElementById('form-agregar').addEventListener('submit', (e) => {
  e.preventDefault();

  const nombreParcela = document.getElementById('nombre-parcela').value;

  const urlParams = new URLSearchParams(window.location.search);
  const itemsParam = urlParams.get('items');
  const itemsExistentes = itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : [];

  itemsExistentes.push({ parcela: nombreParcela });

  const params = new URLSearchParams();
  params.set('items', encodeURIComponent(JSON.stringify(itemsExistentes)));

  window.location.href = 'Home.html?' + params.toString();
});