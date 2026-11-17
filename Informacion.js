document.addEventListener('DOMContentLoaded', () => {
  
  const API_URL = 'http://localhost:3000/api/datos';

  const INTERVALO_REFRESCO_MS = 30000;

  const MODO_PRUEBA = true;

  
  const ESCALAS = {
    temperatura: { unidad: '°C', niveles: [0, 10, 20, 30, 40], claveMin: 'Temperatura Min', claveMax: 'Temperatura Max' },
    humedad:     { unidad: '%',  niveles: [0, 25, 50, 75, 100], claveMin: 'Humedad Min',     claveMax: 'Humedad Max' }
  };

  const ETIQUETAS_X = {
    '24h': ['Hace 24 Horas', 'Hace 20 Horas', 'Hace 16 Horas', 'Hace 12 Horas', 'Hace 8 Horas', 'Hace 4 Horas', 'Ahora'],
    '7d':  ['Hace 6 Días', 'Hace 5 Días', 'Hace 4 Días', 'Hace 3 Días', 'Hace 2 Días', 'Ayer', 'Hoy']
  };

  const params = new URLSearchParams(window.location.search);
  const nombreParcela = params.get('parcela') || '';
  const itemsParam = params.get('items');

  document.getElementById('titulo-informacion').textContent = `Campo “${nombreParcela}”`;

  const linkRegresar = document.getElementById('link-regresar');
  if (itemsParam) {
    const regresoParams = new URLSearchParams();
    regresoParams.set('items', itemsParam);
    linkRegresar.href = 'Home.html?' + regresoParams.toString();
  }

  const estado = { tipo: 'temperatura', rango: '24h' };
  let numeroPedido = 0;                       
  let ultimosValores = Array(7).fill(null);   

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
    return await pedirHistorial(nombreParcela, estado.tipo, estado.rango);
  }

  
  function obtenerLimites() {
    const { claveMin, claveMax } = ESCALAS[estado.tipo];
    const leer = (clave) => {
      const n = parseFloat(localStorage.getItem(`${nombreParcela}: ${clave}`));
      return Number.isFinite(n) && n > 0 ? n : null; 
    };
    return { min: leer(claveMin), max: leer(claveMax) };
  }

  async function cargarDatos() {
    const mio = ++numeroPedido;
    try {
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
});

const paramsInfo = new URLSearchParams(window.location.search);

document.getElementById('boton-circulo').addEventListener('click', () => {
  const nuevos = new URLSearchParams();
  nuevos.set('parcela', paramsInfo.get('parcela') || '');
  nuevos.set('items', paramsInfo.get('items') || '');
  window.location.href = 'campo.html?' + nuevos.toString();
});