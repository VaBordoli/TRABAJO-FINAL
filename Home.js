document.addEventListener('DOMContentLoaded', () => {
  const listaGrandeEl = document.querySelector('.lista-grande');
  const listaChicaEl = document.querySelector('.lista-chica');          // NUEVO
  const botones = document.querySelectorAll('.fila-botones .enlace-boton');
  const primerosTres = Array.from(botones).slice(0, 3);
  const botonAgregar = document.getElementById('boton-agregar');
  const botonEliminar = botones[0];
  const botonInformacion = botones[1];
  const botonEditar = botones[2];
  const botonCirculo = document.getElementById('boton-circulo');

  renderizarListaGrande();
  renderizarNotificaciones();                                           // NUEVO
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

  // ================= NOTIFICACIONES (NUEVO) =================

  // Lee un número guardado en localStorage. Si no existe, devuelve null
  function leerNumero(clave) {
    const valor = localStorage.getItem(clave);
    return valor === null ? null : Number(valor);
  }

  // Si la condición se cumple y no fue descartada, agrega la notificación a la lista.
  // Si la condición ya no se cumple, borra la marca de "descartada"
  // (así, si se vuelve a pasar más adelante, avisa de nuevo).
  function evaluar(lista, id, condicion, texto) {
    const claveDescartada = 'Descartada: ' + id;

    if (!condicion) {
      localStorage.removeItem(claveDescartada);
      return;
    }
    if (localStorage.getItem(claveDescartada)) return;

    lista.push({ id: id, texto: texto });
  }

  // Compara los valores de cada parcela con su mínimo y máximo
  function obtenerNotificaciones() {
    const items = obtenerItemsDeUrl();
    const lista = [];

    items.forEach(item => {
      const p = item.parcela;

      // Se repite lo mismo para temperatura y humedad
      ['Temperatura', 'Humedad'].forEach(tipo => {
        const valor = leerNumero(`${p}: Valor ${tipo}`);
        const min = leerNumero(`${p}: ${tipo} Min`);
        const max = leerNumero(`${p}: ${tipo} Max`);
        const nombre = tipo.toLowerCase();

        if (valor === null) return;

        // Máximo: solo se compara si se cargó uno (0 = sin máximo)
        evaluar(
          lista,
          `${p}|${nombre}|max`,
          max !== null && max > 0 && valor > max,
          `Parcela "${p}" se ha pasado del máximo de ${nombre}`
        );

        // Mínimo
        evaluar(
          lista,
          `${p}|${nombre}|min`,
          min !== null && valor < min,
          `Parcela "${p}" ha bajado del mínimo de ${nombre}`
        );
      });
    });

    return lista;
  }

  // Dibuja el panel con innerHTML
  function renderizarNotificaciones() {
    const notificaciones = obtenerNotificaciones();

    let html = `
      <li class="item-lista item-encabezado">
        <div class="linea facu"> Panel de Notificaciones</div>
      </li>
    `;

    notificaciones.forEach(n => {
      html += `
        <li class="item-lista">
          <div class="marca"></div>
          <div class="linea notificacion">${n.texto}</div>
          <button type="button" class="borrar-notificacion" data-id="${n.id}">✕</button>
        </li>
      `;
    });

    listaChicaEl.innerHTML = html;
  }

  // Un solo listener en la lista: detecta clicks en cualquier ✕
  listaChicaEl.addEventListener('click', (e) => {
    const boton = e.target.closest('.borrar-notificacion');
    if (!boton) return;

    const confirmar = confirm('¿Estás seguro de que cumpliste la consigna?');
    if (!confirmar) return;

    localStorage.setItem('Descartada: ' + boton.dataset.id, 'si');
    renderizarNotificaciones();
  });

  // ==========================================================

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

  botonInformacion.addEventListener('click', () => {
    const itemSeleccionado = document.querySelector('.lista-grande .item-lista.seleccionado');
    if (!itemSeleccionado) return;

    const nombreParcela = itemSeleccionado.querySelector('.linea').value;
    const items = obtenerItemsDeUrl();

    const params = new URLSearchParams();
    params.set('parcela', nombreParcela);
    params.set('items', encodeURIComponent(JSON.stringify(items)));

    window.location.href = 'campo.html?' + params.toString();
  });

  botonEditar.addEventListener('click', () => {
    const itemSeleccionado = document.querySelector('.lista-grande .item-lista.seleccionado');
    if (!itemSeleccionado) return;

    const nombreParcela = itemSeleccionado.querySelector('.linea').value;
    const items = obtenerItemsDeUrl();

    const params = new URLSearchParams();
    params.set('parcela', nombreParcela);
    params.set('items', encodeURIComponent(JSON.stringify(items)));

    window.location.href = 'editar.html?' + params.toString();
  });

  botonCirculo.addEventListener('click', () => {
    const items = obtenerItemsDeUrl();
    const params = new URLSearchParams();
    params.set('items', encodeURIComponent(JSON.stringify(items)));

    window.location.href = 'perfil.html?' + params.toString();
  });
});