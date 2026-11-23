document.addEventListener('DOMContentLoaded', () => {
  if (!requerirSesion()) return;

  const INTERVALO_REFRESCO_MS = 30000;

  const ESCALAS = {
    temperatura: { unidad: '°C', niveles: [0, 10, 20, 30, 40] },
    humedad:     { unidad: '%',  niveles: [0, 25, 50, 75, 100] }
  };

  const ETIQUETAS_X = {
    '24h': ['Hace 24 Horas', 'Hace 20 Horas', 'Hace 16 Horas', 'Hace 12 Horas', 'Hace 8 Horas', 'Hace 4 Horas', 'Ahora'],
    '7d':  ['Hace 6 Días', 'Hace 5 Días', 'Hace 4 Días', 'Hace 3 Días', 'Hace 2 Días', 'Ayer', 'Hoy']
  };

  const params = new URLSearchParams(window.location.search);
  const nombreParcela = params.get('parcela') || '';
  const idCampo = params.get('id') || '';
  const dispositivo = params.get('dispositivo') || '';

  document.getElementById('titulo-informacion').textContent = `Campo “${nombreParcela}”`;

  const estado = { tipo: 'temperatura', rango: '24h' };
  let numeroPedido = 0;
  let ultimosValores = Array(7).fill(null);
  let rangos = null; // límites configurados en el back

  const svg = document.getElementById('grafico');
  const mensaje = document.getElementById('mensaje-grafico');

  function activarToggle(idContenedor, atributo, clave) {
    const botones = document.querySelectorAll(`#${idContenedor} .opcion`);
    botones.forEach(boton => {
      boton.addEventListener('click', () => {
        botones.forEach(b => b.classList.remove('activa'));
        boton.classList.add('activa');
        estado[clave] = boton.dataset[atributo];
        cargarDatos();
      });
    });
  }
  activarToggle('toggle-tipo', 'tipo', 'tipo');
  activarToggle('toggle-rango', 'rango', 'rango');

  async function pedirValores() {
    return await pedirHistorial(dispositivo, estado.tipo, estado.rango);
  }

  function obtenerLimites() {
    const r = rangos && rangos[estado.tipo];
    const leer = (n) => (Number.isFinite(n) && n > 0 ? n : null);
    return r ? { min: leer(r.valorminimo), max: leer(r.valormaximo) } : { min: null, max: null };
  }

  async function cargarDatos() {
    const mio = ++numeroPedido;
    try {
      if (!rangos && idCampo) rangos = await pedirRangos(idCampo);
      const valores = await pedirValores();
      if (mio !== numeroPedido) return;
      mensaje.hidden = true;
      dibujar(valores);
    } catch (error) {
      if (mio !== numeroPedido) return;
      console.error('Error al pedir datos:', error);
      dibujar(Array(7).fill(null));
      mensaje.textContent = 'No se pudieron obtener los datos';
      mensaje.hidden = false;
    }
  }

  function dibujar(valores) {
    ultimosValores = valores;

    const { niveles, unidad } = ESCALAS[estado.tipo];
    const etiquetasX = ETIQUETAS_X[estado.rango];
    const min = niveles[0];
    const max = niveles[niveles.length - 1];

    const ancho = svg.clientWidth || 1000;
    const alto = svg.clientHeight || 430;
    svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);

    const izq = 55, der = ancho - 65, arriba = 12, abajo = alto - 40;
    const margenX = Math.min(50, (der - izq) / 14);
    const xDe = i => izq + margenX + (i * (der - izq - 2 * margenX)) / 6;
    const yDe = v => abajo - ((Math.min(Math.max(v, min), max) - min) / (max - min)) * (abajo - arriba);

    let html = `<rect x="${izq}" y="${arriba - 8}" width="${der - izq}" height="${abajo - arriba + 16}" rx="8"/>`;

    niveles.forEach(n => {
      const y = yDe(n);
      html += `<line class="grid-h" x1="${izq}" x2="${der}" y1="${y}" y2="${y}"/>`;
      html += `<text class="texto-eje" x="${izq - 8}" y="${y + 5}" text-anchor="end">${n}${unidad}</text>`;
    });

    etiquetasX.forEach((etiqueta, i) => {
      const x = xDe(i);
      html += `<line class="grid-v" x1="${x}" x2="${x}" y1="${arriba - 8}" y2="${abajo + 8}"/>`;
      html += `<text class="texto-eje" x="${x}" y="${abajo + 28}" text-anchor="middle">${etiqueta}</text>`;
    });

    const limites = obtenerLimites();
    [
      { valor: limites.max, texto: 'Max', clase: 'max' },
      { valor: limites.min, texto: 'Min', clase: 'min' }
    ].forEach(l => {
      if (l.valor === null) return;
      const y = yDe(l.valor);
      html += `<line class="linea-limite linea-${l.clase}" x1="${izq}" x2="${der}" y1="${y}" y2="${y}"/>`;
      html += `<rect class="fondo-etiqueta-limite fondo-${l.clase}" x="${der + 2}" y="${y - 9}" width="56" height="18" rx="4"/>`;
      html += `<text class="etiqueta-limite" x="${der + 30}" y="${y + 4}" text-anchor="middle">${l.texto}</text>`;
    });

    let trazo = '';
    let anteriorValido = false;
    valores.forEach((v, i) => {
      if (v === null) { anteriorValido = false; return; }
      trazo += `${anteriorValido ? 'L' : 'M'}${xDe(i)},${yDe(v)} `;
      anteriorValido = true;
    });
    if (trazo) html += `<path class="linea-datos" d="${trazo}"/>`;

    valores.forEach((v, i) => {
      if (v === null) return;
      html += `<circle class="punto" cx="${xDe(i)}" cy="${yDe(v)}" r="5"><title>${etiquetasX[i]}: ${v.toFixed(1)}${unidad}</title></circle>`;
    });

    svg.innerHTML = html;
  }

  window.addEventListener('resize', () => dibujar(ultimosValores));

  dibujar(Array(7).fill(null));
  cargarDatos();
  if (INTERVALO_REFRESCO_MS > 0) setInterval(cargarDatos, INTERVALO_REFRESCO_MS);

  // volver a la pantalla del campo (si el botón tiene id; si no, el <a> ya vuelve a Home)
  const botonCirculo = document.getElementById('boton-circulo');
  if (botonCirculo) {
    botonCirculo.addEventListener('click', () => {
      const nuevos = new URLSearchParams();
      nuevos.set('id', idCampo);
      nuevos.set('parcela', nombreParcela);
      nuevos.set('dispositivo', dispositivo);
      window.location.href = PAGINAS.campo + '?' + nuevos.toString();
    });
  }
});