document.addEventListener('DOMContentLoaded', () => {
  const idUsuario = requerirSesion();
  if (!idUsuario) return;

  const listaGrandeEl = document.querySelector('.lista-grande');
  const listaChicaEl = document.querySelector('.lista-chica');
  const botones = document.querySelectorAll('.fila-botones .enlace-boton');
  const primerosTres = Array.from(botones).slice(0, 3);
  const botonAgregar = document.getElementById('boton-agregar');
  const botonEliminar = botones[0];
  const botonInformacion = botones[1];
  const botonEditar = botones[2];
  const botonCirculo = document.getElementById('boton-circulo');

  let campos = [];
  let notificaciones = [];
  let visibles = [];

  function esc(t) {
    return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Lista de campos ----------
  function deseleccionar() {
    document.querySelectorAll('.lista-grande .item-lista').forEach(i => i.classList.remove('seleccionado'));
    primerosTres.forEach(b => b.classList.add('deshabilitado'));
  }

  function campoSeleccionado() {
    const li = document.querySelector('.lista-grande .item-lista.seleccionado');
    return li ? campos.find(c => String(c.id) === li.dataset.id) || null : null;
  }

  function renderizarListaGrande() {
    listaGrandeEl.innerHTML = '';
    campos.forEach(c => {
      const li = document.createElement('li');
      li.className = 'item-lista';
      li.dataset.id = c.id;
      li.innerHTML = `
        <button type="button" class="marca"></button>
        <input class="linea" readonly value="${esc(c.nombre)}">
        <div class="pildora-seleccion"></div>
      `;
      listaGrandeEl.appendChild(li);
    });
    deseleccionar();
  }

  listaGrandeEl.addEventListener('click', (e) => {
    const li = e.target.closest('.item-lista');
    if (!li) return;
    e.stopPropagation();
    document.querySelectorAll('.lista-grande .item-lista').forEach(i => i.classList.remove('seleccionado'));
    li.classList.add('seleccionado');
    primerosTres.forEach(b => b.classList.remove('deshabilitado'));
  });

  document.addEventListener('click', (e) => {
    if (!listaGrandeEl.contains(e.target)) deseleccionar();
  });

  // ---------- Notificaciones ----------
  // El back no tiene endpoint para borrarlas: "descartar" se guarda solo en este navegador.
  const claveDescarte = (n) =>
    `Descartada: ${idUsuario}|${n.id_dispositivo}|${n.dia_hora}|${n.variable}|${n.mensaje}`;

  function renderizarNotificaciones() {
    const nombres = {};
    campos.forEach(c => { nombres[c.id_dispositivo] = c.nombre; });

    visibles = notificaciones
      .filter(n => !localStorage.getItem(claveDescarte(n)))
      .reverse(); // las más nuevas primero

    let html = `
      <li class="item-lista item-encabezado">
        <div class="linea facu"> Panel de Notificaciones</div>
      </li>
    `;
    visibles.forEach((n, i) => {
      const nombre = nombres[n.id_dispositivo] || n.id_dispositivo;
      html += `
        <li class="item-lista">
          <div class="marca"></div>
          <div class="linea notificacion" title="${esc(n.dia_hora)} (valor: ${esc(n.valor)})">Parcela "${esc(nombre)}": ${esc(n.mensaje)}</div>
          <button type="button" class="borrar-notificacion" data-i="${i}">✕</button>
        </li>
      `;
    });
    listaChicaEl.innerHTML = html;
  }

  listaChicaEl.addEventListener('click', (e) => {
    const boton = e.target.closest('.borrar-notificacion');
    if (!boton) return;
    if (!confirm('¿Estás seguro de que cumpliste la consigna?')) return;
    const n = visibles[Number(boton.dataset.i)];
    if (n) localStorage.setItem(claveDescarte(n), 'si');
    renderizarNotificaciones();
  });

  async function actualizarNotificaciones() {
    try {
      notificaciones = await pedirNotificaciones();
    } catch (error) {
      console.error('No se pudieron leer las notificaciones', error);
    }
    renderizarNotificaciones();
  }

  // ---------- Botones ----------
  botonAgregar.addEventListener('click', () => {
    window.location.href = PAGINAS.agregar;
  });

  botonEliminar.addEventListener('click', async () => {
    const c = campoSeleccionado();
    if (!c) return;
    if (!confirm('¿Estás seguro de eliminar esta parcela?')) return;
    try {
      await api('DELETE', `/api/campos/${c.id}`, { query: { id_usuario: idUsuario } });
      campos = await listarCampos();
      renderizarListaGrande();
      actualizarNotificaciones();
    } catch (err) {
      alert(err.message);
    }
  });

  botonInformacion.addEventListener('click', () => {
    const c = campoSeleccionado();
    if (!c) return;
    const params = new URLSearchParams();
    params.set('id', c.id);
    params.set('parcela', c.nombre);
    params.set('dispositivo', c.id_dispositivo);
    window.location.href = PAGINAS.campo + '?' + params.toString();
  });

  botonEditar.addEventListener('click', () => {
    const c = campoSeleccionado();
    if (!c) return;
    const params = new URLSearchParams();
    params.set('id', c.id);
    window.location.href = PAGINAS.editar + '?' + params.toString();
  });

  botonCirculo.addEventListener('click', () => {
    window.location.href = PAGINAS.perfil;
  });

  // ---------- Inicio ----------
  (async () => {
    try {
      campos = await listarCampos();
    } catch (err) {
      alert(err.message);
    }
    renderizarListaGrande();
    actualizarNotificaciones();
  })();
  setInterval(actualizarNotificaciones, 5000);
});