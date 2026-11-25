document.addEventListener('DOMContentLoaded', () => {
  if (!requerirSesion()) return;

  const parametros = new URLSearchParams(window.location.search);
  const idCampo = parametros.get('id') || '';
  const parcela = parametros.get('parcela') || '';
  const dispositivo = parametros.get('dispositivo') || '';
  const titulo = document.getElementById('titulo-historial');
  const estado = document.getElementById('estado-historial');
  const contenedorTabla = document.getElementById('tabla-contenedor');
  const filas = document.getElementById('filas-historial');

  titulo.textContent = 'Historial de "' + parcela + '"';

  document.getElementById('boton-regresar').addEventListener('click', () => {
    if (!idCampo || !dispositivo) {
      window.location.href = PAGINAS.home;
      return;
    }

    const nuevos = new URLSearchParams();
    nuevos.set('id', idCampo);
    nuevos.set('parcela', parcela);
    nuevos.set('dispositivo', dispositivo);
    window.location.href = PAGINAS.campo + '?' + nuevos.toString();
  });

  function formatearFecha(valor) {
    if (!valor) {
      return 'Fecha no disponible';
    }

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return String(valor);
    }
    return fecha.toLocaleString('es-AR');
  }

  function formatearMedida(valor, unidad) {
    if (valor === null || valor === undefined || valor === '') {
      return '—';
    }

    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
      return '—';
    }
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(numero) + unidad;
  }

  function agregarFila(medicion) {
    const medidas = medicion.medidas_tierras || {};
    const fila = document.createElement('tr');
    const celdaFecha = document.createElement('td');
    const fecha = document.createElement('time');

    fecha.dateTime = medicion.dia_hora || '';
    fecha.textContent = formatearFecha(medicion.dia_hora);
    celdaFecha.append(fecha);
    fila.append(celdaFecha);

    const temperatura = document.createElement('td');
    temperatura.textContent = formatearMedida(medidas.temperatura, ' °C');
    fila.append(temperatura);

    const humedad = document.createElement('td');
    humedad.textContent = formatearMedida(medidas.humedad, ' %');
    fila.append(humedad);

    const corriente = document.createElement('td');
    corriente.textContent = formatearMedida(medidas.conductividad, ' S');
    fila.append(corriente);

    filas.append(fila);
  }

  async function cargarMediciones() {
    if (!idCampo || !dispositivo) {
      estado.textContent = 'No se encontró la información del campo para cargar el historial.';
      return;
    }

    try {
      const mediciones = await pedirMedicionesHistoricas(dispositivo);
      if (!Array.isArray(mediciones)) {
        throw new Error('El servidor devolvió un historial inválido');
      }

      if (mediciones.length === 0) {
        estado.textContent = 'Todavía no hay mediciones históricas para este sensor.';
        return;
      }

      const ordenadas = mediciones.slice().sort((primera, segunda) => {
        const fechaPrimera = new Date(primera.dia_hora).getTime();
        const fechaSegunda = new Date(segunda.dia_hora).getTime();
        return fechaSegunda - fechaPrimera;
      });

      ordenadas.forEach(agregarFila);
      if (ordenadas.length === 1) {
        estado.textContent = '1 medición histórica';
      } else {
        estado.textContent = ordenadas.length + ' mediciones históricas';
      }
      contenedorTabla.hidden = false;
    } catch (error) {
      console.error(error);
      estado.textContent = 'No se pudieron cargar las mediciones: ' + error.message;
    }
  }

  cargarMediciones();
});
