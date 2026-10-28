document.addEventListener('DOMContentLoaded', () => {
  // ================= CONFIGURACIÓN =================
  // Dirección del programa que envía los datos (cambiala por la tuya).
  const API_URL = 'http://localhost:3000/api/datos';
  // Cada cuánto se vuelve a pedir la info (ms). 0 = no refrescar.
  const INTERVALO_REFRESCO_MS = 30000;
  // true = usa datos inventados para probar el diseño sin programa externo.
  const MODO_PRUEBA = false;

  // 5 niveles en el eje Y (según el tipo de dato)
  // ★ CAMBIO 1: ahora hay claveMin y claveMax en vez de claveLocal
  const ESCALAS = {
    temperatura: { unidad: '°C', niveles: [0, 10, 20, 30, 40], claveMin: 'Temperatura Min', claveMax: 'Temperatura Max' },
    humedad:     { unidad: '%',  niveles: [0, 25, 50, 75, 100], claveMin: 'Humedad Min',     claveMax: 'Humedad Max' }
  };

  // 7 puntos en el eje X (según el rango)
  const ETIQUETAS_X = {
    '24h': ['Hace 24 Horas', 'Hace 20 Horas', 'Hace 16 Horas', 'Hace 12 Horas', 'Hace 8 Horas', 'Hace 4 Horas', 'Ahora'],
    '7d':  ['Hace 6 Días', 'Hace 5 Días', 'Hace 4 Días', 'Hace 3 Días', 'Hace 2 Días', 'Ayer', 'Hoy']
  };

  // ================= TÍTULO Y REGRESAR =================
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

  // ================= ESTADO =================
  const estado = { tipo: 'temperatura', rango: '24h' };
  let numeroPedido = 0;                       // para ignorar respuestas viejas
  let ultimosValores = Array(7).fill(null);   // para redibujar al cambiar el tamaño

  const svg = document.getElementById('grafico');
  const mensaje = document.getElementById('mensaje-grafico');

  // ================= TOGGLES =================
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

  // ================= DATOS =================
  // El programa externo debe responder JSON así:
  //   { "valores": [n1, n2, n3, n4, n5, n6, n7] }   (o directamente el array)
  // Un valor null/ausente deja ese punto vacío.
  async function pedirValores() {
    if (MODO_PRUEBA) {
      const { niveles } = ESCALAS[estado.tipo];
      const min = niveles[0], max = niveles[niveles.length - 1];
      return Array.from({ length: 7 }, () => min + Math.random() * (max - min) * 0.6 + (max - min) * 0.1);
    }

    const url = `${API_URL}?${new URLSearchParams({
      parcela: nombreParcela,
      tipo: estado.tipo,
      rango: estado.rango
    })}`;

    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
    const datos = await respuesta.json();
    const lista = Array.isArray(datos) ? datos : datos.valores;
    if (!Array.isArray(lista)) throw new Error('Formato inesperado');

    // Siempre 7 posiciones
    return Array.from({ length: 7 }, (_, i) => {
      const n = parseFloat(lista[i]);
      return Number.isFinite(n) ? n : null;
    });
  }

  // ★ CAMBIO 2: esta función reemplaza a obtenerReferencia
  // Lee del localStorage el Min y el Max que se cargaron en el formulario
  function obtenerLimites() {
    const { claveMin, claveMax } = ESCALAS[estado.tipo];
    const leer = (clave) => {
      const n = parseFloat(localStorage.getItem(`${nombreParcela}: ${clave}`));
      return Number.isFinite(n) && n > 0 ? n : null; // 0 = campo vacío en el formulario
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

  // ================= DIBUJO =================
  function dibujar(valores) {
    ultimosValores = valores;

    const { niveles, unidad } = ESCALAS[estado.tipo];
    const etiquetasX = ETIQUETAS_X[estado.rango];
    const min = niveles[0];
    const max = niveles[niveles.length - 1];

    // El gráfico usa el tamaño real de la caja: no quedan espacios vacíos
    const ancho = svg.clientWidth || 1000;
    const alto = svg.clientHeight || 430;
    svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);

    const izq = 55, der = ancho - 65, arriba = 12, abajo = alto - 40;
    const margenX = Math.min(50, (der - izq) / 14);
    const xDe = i => izq + margenX + (i * (der - izq - 2 * margenX)) / 6;
    const yDe = v => abajo - ((Math.min(Math.max(v, min), max) - min) / (max - min)) * (abajo - arriba);

    let html = `<rect x="${izq}" y="${arriba - 8}" width="${der - izq}" height="${abajo - arriba + 16}" rx="8"/>`;

    // 5 niveles horizontales
    niveles.forEach(n => {
      const y = yDe(n);
      html += `<line class="grid-h" x1="${izq}" x2="${der}" y1="${y}" y2="${y}"/>`;
      html += `<text class="texto-eje" x="${izq - 8}" y="${y + 5}" text-anchor="end">${n}${unidad}</text>`;
    });

    // 7 columnas de tiempo
    etiquetasX.forEach((etiqueta, i) => {
      const x = xDe(i);
      html += `<line class="grid-v" x1="${x}" x2="${x}" y1="${arriba - 8}" y2="${abajo + 8}"/>`;
      html += `<text class="texto-eje" x="${x}" y="${abajo + 28}" text-anchor="middle">${etiqueta}</text>`;
    });

    // ★ CAMBIO 3: acá estaba el bloque de "Promedio"; ahora son las líneas Max y Min
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

    // Línea de datos (se corta si falta un valor)
    let trazo = '';
    let anteriorValido = false;
    valores.forEach((v, i) => {
      if (v === null) { anteriorValido = false; return; }
      trazo += `${anteriorValido ? 'L' : 'M'}${xDe(i)},${yDe(v)} `;
      anteriorValido = true;
    });
    if (trazo) html += `<path class="linea-datos" d="${trazo}"/>`;

    // Puntos con valor al pasar el mouse
    valores.forEach((v, i) => {
      if (v === null) return;
      html += `<circle class="punto" cx="${xDe(i)}" cy="${yDe(v)}" r="5"><title>${etiquetasX[i]}: ${v.toFixed(1)}${unidad}</title></circle>`;
    });

    svg.innerHTML = html;
  }

  // Redibujar si cambia el tamaño de la ventana
  window.addEventListener('resize', () => dibujar(ultimosValores));

  // ================= INICIO =================
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