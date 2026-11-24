document.addEventListener('DOMContentLoaded', () => {
  if (!requerirSesion()) return;

  const INTERVALO_REFRESCO_MS = 5000;

  const ESCALAS = {
    temperatura: { unidad: '°C', niveles: [0, 10, 20, 30, 40] },
    humedad:     { unidad: '%',  niveles: [0, 25, 50, 75, 100] }
  };

  const ETIQUETAS_X = {
    '30s': ['Hace 30 s', 'Hace 20 s', 'Hace 10 s', 'Hace 5 s', 'Ahora'],
    '7d': ['Hace 7 días', 'Hace 5 días', 'Hace 3 días', 'Hace 24 horas', 'Hace 12 horas']
  };

  const params = new URLSearchParams(window.location.search);
  const nombreParcela = params.get('parcela') || '';
  const idCampo = params.get('id') || '';
  const dispositivo = params.get('dispositivo') || '';

  document.getElementById('titulo-informacion').textContent = `Campo “${nombreParcela}”`;

  const estado = { tipo: 'temperatura', rango: '30s' };
  let numeroPedido = 0;
  let rangos = null; // límites configurados en el back

  const canvas = document.getElementById('grafico');
  const mensaje = document.getElementById('mensaje-grafico');
  const mensajeRangos = document.getElementById('mensaje-rangos');
  if (typeof Chart === 'undefined') {
    mensaje.textContent = 'No se pudo cargar Chart.js. Revisá la conexión a Internet.';
    mensaje.hidden = false;
    return;
  }

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
    const leer = (n) => {
      if (n === null || n === undefined || n === '') return null;
      const valor = Number(n);
      return Number.isFinite(valor) ? valor : null;
    };
    return r ? { min: leer(r.valorminimo), max: leer(r.valormaximo) } : { min: null, max: null };
  }

  const fondoGrafico = {
    id: 'fondoGrafico',
    beforeDraw(chart) {
      if (!chart.chartArea) return;
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.fillStyle = '#a8a5a5';
      ctx.fillRect(
        chartArea.left,
        chartArea.top,
        chartArea.right - chartArea.left,
        chartArea.bottom - chartArea.top
      );
      ctx.restore();
    }
  };

  const etiquetasLimites = {
    id: 'etiquetasLimites',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      ctx.save();
      ctx.font = '600 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      chart.data.datasets.slice(1).forEach(dataset => {
        const valor = dataset.data[0];
        if (!Number.isFinite(valor)) return;

        const y = Math.max(
          chartArea.top + 9,
          Math.min(chartArea.bottom - 9, scales.y.getPixelForValue(valor))
        );
        const x = chartArea.right + 5;
        ctx.fillStyle = dataset.borderColor;
        ctx.fillRect(x, y - 9, 40, 18);
        ctx.fillStyle = '#fff';
        ctx.fillText(dataset.label, x + 20, y);
      });

      ctx.restore();
    }
  };

  const grafico = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ETIQUETAS_X[estado.rango],
      datasets: [
        {
          label: 'Medición',
          data: Array(5).fill(null),
          borderColor: '#000',
          backgroundColor: '#000',
          borderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 6,
          spanGaps: false,
          tension: 0
        },
        {
          label: 'Max',
          data: [],
          borderColor: '#e53935',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          order: 1
        },
        {
          label: 'Min',
          data: [],
          borderColor: '#1e88e5',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'nearest', intersect: false },
      layout: { padding: { top: 8, right: 52, bottom: 0, left: 8 } },
      scales: {
        x: {
          grid: { color: '#c4c4c4', lineWidth: 2 },
          ticks: {
            color: '#000',
            font: { family: 'sans-serif', size: 13, weight: '600' },
            maxRotation: 0,
            autoSkip: false
          }
        },
        y: {
          min: 0,
          max: 40,
          grid: { color: '#c4c4c4', lineWidth: 2 },
          ticks: {
            color: '#000',
            font: { family: 'sans-serif', size: 13, weight: '600' },
            stepSize: 10,
            callback: valor => `${valor}${ESCALAS[estado.tipo].unidad}`
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: contexto => contexto.datasetIndex === 0,
          callbacks: {
            label(contexto) {
              return `${contexto.parsed.y.toFixed(1)}${ESCALAS[estado.tipo].unidad}`;
            }
          }
        }
      }
    },
    plugins: [fondoGrafico, etiquetasLimites]
  });

  async function cargarDatos() {
    const mio = ++numeroPedido;
    try {
      if (!MODO_PRUEBA && (!idCampo || !dispositivo)) {
        throw new Error('No se recibió el ID del campo o del sensor para el gráfico');
      }
      if (!rangos && idCampo) rangos = await pedirRangos(idCampo);
      const valores = await pedirValores();
      if (mio !== numeroPedido) return;
      const hayDatos = valores.some(valor => Number.isFinite(valor));
      const limites = obtenerLimites();
      const hayLimites = limites.min !== null && limites.max !== null;
      const avisos = [];
      if (MODO_PRUEBA) avisos.push('Modo de prueba: datos simulados');
      if (!hayLimites) avisos.push('No se pudieron cargar los límites; verificá el campo y la sesión');
      mensajeRangos.textContent = avisos.join(' | ');
      mensajeRangos.hidden = avisos.length === 0;
      mensaje.textContent = hayDatos ? '' : 'No hay mediciones en el período seleccionado';
      mensaje.hidden = hayDatos;
      dibujar(valores);
    } catch (error) {
      if (mio !== numeroPedido) return;
      console.error('Error al pedir datos:', error);
      dibujar(Array(5).fill(null));
      mensaje.textContent = error.message || 'No se pudieron obtener los datos';
      mensaje.hidden = false;
    }
  }

  function dibujar(valores) {
    const { niveles, unidad } = ESCALAS[estado.tipo];
    const etiquetasX = ETIQUETAS_X[estado.rango];
    const limites = obtenerLimites();
    const minEje = niveles[0];
    const maxEje = niveles[niveles.length - 1];
    const limitar = valor => Math.min(Math.max(valor, minEje), maxEje);

    grafico.data.labels = etiquetasX;
    grafico.data.datasets[0].data = valores;
    grafico.data.datasets[1].data = etiquetasX.map(() =>
      limites.max === null ? null : limitar(limites.max));
    grafico.data.datasets[2].data = etiquetasX.map(() =>
      limites.min === null ? null : limitar(limites.min));
    grafico.options.scales.y.min = minEje;
    grafico.options.scales.y.max = maxEje;
    grafico.options.scales.y.ticks.stepSize = niveles[1] - niveles[0];
    grafico.options.scales.y.ticks.callback = valor => `${valor}${unidad}`;
    grafico.update('none');
  }

  dibujar(Array(5).fill(null));
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