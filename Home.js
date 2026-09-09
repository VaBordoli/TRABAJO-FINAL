document.addEventListener('DOMContentLoaded', () => {
  const listaGrandeEl = document.querySelector('.lista-grande');
  const botones = document.querySelectorAll('.fila-botones .enlace-boton');
  const primerosTres = Array.from(botones).slice(0, 3);
  const botonAgregar = document.getElementById('boton-agregar');
  const botonEliminar = botones[0];
  const botonCirculo = document.getElementById('boton-circulo');

  renderizarListaGrande();
  primerosTres.forEach(boton => boton.classList.add('deshabilitado'));

  function obtenerItemsDeUrl() {
    const params = new URLSearchParams(window.location.search);
    const itemsParam = params.get('items');
    return itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : [];
  }

  function renderizarListaGrande() {
    const items = obtenerItemsDeUrl();

    listaGrandeEl.innerHTML = '';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'item-lista';
      li.innerHTML = `
        <button type="button" class="marca"></button>
        <input class="linea" readonly value="${item.parcela}">
        <div class="pildora-seleccion"></div>
      `;
      listaGrandeEl.appendChild(li);
    });

    activarSeleccion();
  }

  function activarSeleccion() {
    const itemsListaGrande = document.querySelectorAll('.lista-grande .item-lista');

    itemsListaGrande.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        itemsListaGrande.forEach(i => i.classList.remove('seleccionado'));
        item.classList.add('seleccionado');
        primerosTres.forEach(boton => boton.classList.remove('deshabilitado'));
      });
    });

    document.addEventListener('click', (e) => {
      if (!listaGrandeEl.contains(e.target)) {
        itemsListaGrande.forEach(i => i.classList.remove('seleccionado'));
        primerosTres.forEach(boton => boton.classList.add('deshabilitado'));
      }
    });
  }

  botonAgregar.addEventListener('click', () => {
    const items = obtenerItemsDeUrl();
    const params = new URLSearchParams();
    params.set('items', encodeURIComponent(JSON.stringify(items)));

    window.location.href = 'lista.html?' + params.toString();
  });

  botonEliminar.addEventListener('click', () => {
    const itemSeleccionado = document.querySelector('.lista-grande .item-lista.seleccionado');
    if (!itemSeleccionado) return;

    const confirmar = confirm('¿Estás seguro de eliminar esta parcela?');
    if (!confirmar) return;

    const items = obtenerItemsDeUrl();
    const index = Array.from(listaGrandeEl.children).indexOf(itemSeleccionado);
    items.splice(index, 1);

    const params = new URLSearchParams();
    params.set('items', encodeURIComponent(JSON.stringify(items)));

    window.location.href = 'Home.html?' + params.toString();
  });

  botonCirculo.addEventListener('click', () => {
    window.location.href = 'Perfil.html';
  });
});