const API_URL = 'http://localhost:3000';
const MODO_PRUEBA = false;
const RANGOS_PRUEBA = {
  temperatura: { valorminimo: 0, valormaximo: 40 },
  humedad: { valorminimo: 0, valormaximo: 100 },
  conductividad: { valorminimo: 0, valormaximo: 20 }
};
const CLAVE_SESION = 'id_usuario';

const PAGINAS = {
  bienvenida: 'Bienvenida.html',
  home: 'Home.html',
  perfil: 'perfil.html',
  campo: 'campo.html',
  informacion: 'Informacion.html',
  historial: 'Historial.html',
  editar: 'editar.html',
  agregar: 'lista.html'
};

function validarLimites() {
  const rangos = [
    { nombre: 'Humedad', minimo: 'humedad-min', maximo: 'humedad-max' },
    { nombre: 'Temperatura', minimo: 'temperatura-min', maximo: 'temperatura-max' },
    { nombre: 'Corriente', minimo: 'corriente-min', maximo: 'corriente-max' }
  ];
  let validos = true;

  rangos.forEach(function (rango) {
    const inputMinimo = document.getElementById(rango.minimo);
    const inputMaximo = document.getElementById(rango.maximo);
    const textoMinimo = inputMinimo.value.replace(/\D/g, '');
    const textoMaximo = inputMaximo.value.replace(/\D/g, '');

    if (textoMinimo === '') {
      inputMinimo.setCustomValidity('Completá el valor mínimo de ' + rango.nombre.toLowerCase() + '.');
      validos = false;
    } else {
      inputMinimo.setCustomValidity('');
    }
    if (textoMaximo === '') {
      inputMaximo.setCustomValidity('Completá el valor máximo de ' + rango.nombre.toLowerCase() + '.');
      validos = false;
    } else {
      inputMaximo.setCustomValidity('');
    }

    if (textoMinimo === '' || textoMaximo === '') {
      return;
    }

    const valorMinimo = parseInt(textoMinimo, 10);
    const valorMaximo = parseInt(textoMaximo, 10);
    if (valorMinimo > valorMaximo) {
      const unidad = inputMinimo.dataset.sufijo;
      inputMinimo.setCustomValidity(
        rango.nombre + ': el valor mínimo (' + valorMinimo + unidad +
        ') no puede ser mayor que el valor máximo (' + valorMaximo + unidad + ').'
      );
      inputMaximo.setCustomValidity(
        rango.nombre + ': el valor máximo (' + valorMaximo + unidad +
        ') no puede ser menor que el valor mínimo (' + valorMinimo + unidad + ').'
      );
      validos = false;
    } else {
      inputMinimo.setCustomValidity('');
      inputMaximo.setCustomValidity('');
    }
  });

  return validos;
}

async function api(metodo, ruta, { query, body } = {}) {
  let qs = '';
  if (query) {
    qs = '?' + new URLSearchParams(query).toString();
  }
  const opciones = { method: metodo, headers: {} };
  if (body !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(body);
  }
  let respuesta;
  try {
    respuesta = await fetch(API_URL + ruta + qs, opciones);
  } catch (e) {
    throw new Error('No se pudo conectar con el servidor');
  }
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (e) {
    console.error('La respuesta del servidor no tiene un formato JSON válido', e);
  }
  if (!respuesta.ok) {
    const error = new Error((datos && datos.message) || 'Error HTTP ' + respuesta.status);
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}

function guardarSesion(id) { localStorage.setItem(CLAVE_SESION, String(id)); }
function obtenerIdUsuario() {
  const n = Number(localStorage.getItem(CLAVE_SESION));
  if (n > 0) {
    return n;
  }
  return null;
}
function configurarVisibilidadContrasena(idEntrada, idBoton) {
  const entrada = document.getElementById(idEntrada);
  const boton = document.getElementById(idBoton);
  const icono = boton.querySelector('img');

  const ocultar = () => {
    entrada.type = 'password';
    boton.setAttribute('aria-label', 'Mostrar contraseña');
    boton.setAttribute('aria-pressed', 'false');
    icono.src = 'img/contrasena-oculta.png';
  };

  ocultar();
  boton.addEventListener('click', () => {
    const mostrar = entrada.type === 'password';
    if (mostrar) {
      entrada.type = 'text';
      boton.setAttribute('aria-label', 'Ocultar contraseña');
    } else {
      entrada.type = 'password';
      boton.setAttribute('aria-label', 'Mostrar contraseña');
    }
    boton.setAttribute('aria-pressed', String(mostrar));
    if (mostrar) {
      icono.src = 'img/contrasena-visible.png';
    } else {
      icono.src = 'img/contrasena-oculta.png';
    }
  });
  return ocultar;
}
function valorDePrueba(tipo) {
  let clave = tipo;
  if (tipo === 'corriente') {
    clave = 'conductividad';
  }
  const { valorminimo, valormaximo } = RANGOS_PRUEBA[clave];
  return Number((valorminimo + Math.random() * (valormaximo - valorminimo)).toFixed(1));
}
function historialDePrueba(tipo) {
  let clave = tipo;
  if (tipo === 'corriente') {
    clave = 'conductividad';
  }
  const { valorminimo, valormaximo } = RANGOS_PRUEBA[clave];
  const amplitud = valormaximo - valorminimo;
  const valores = Array.from({ length: 5 }, (_, i) => {
    const proporcion = 0.1 + (0.8 * i) / 4 + (Math.random() - 0.5) * 0.05;
    return Number((valorminimo + amplitud * proporcion).toFixed(1));
  });

  for (let i = valores.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [valores[i], valores[j]] = [valores[j], valores[i]];
  }
  return valores;
}
function requerirSesion() {
  const id = obtenerIdUsuario();
  if (!id) {
    window.location.href = PAGINAS.bienvenida;
    return null;
  }
  return id;
}
async function cerrarSesion() {
  try { await api('POST', '/api/auth/logout'); } catch (e) { console.error(e); }
  localStorage.removeItem(CLAVE_SESION);
  window.location.href = PAGINAS.bienvenida;
}

async function listarCampos() {
  const r = await api('GET', '/api/campos', { query: { id_usuario: obtenerIdUsuario() } });
  return r.campos;
}
async function pedirRangos(idCampo) {
  try {
    const r = await api('GET', `/api/campos/${idCampo}/valores-predeterminados`,
      { query: { id_usuario: obtenerIdUsuario() } });
    return r.valores;
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

async function pedirValorActual(dispositivo) {
  if (MODO_PRUEBA) {
    return {
      temperatura: valorDePrueba('temperatura'),
      humedad: valorDePrueba('humedad'),
      corriente: valorDePrueba('corriente')
    };
  }
  try {
    const r = await api('GET', `/api/sensores/${encodeURIComponent(dispositivo)}/ultimos-datos`,
      { query: { id_usuario: obtenerIdUsuario() } });
    const m = r.dato.medidas_tierras;
    return { temperatura: m.temperatura, humedad: m.humedad, corriente: m.conductividad };
  } catch (e) {
    if (e.status === 404) return { temperatura: null, humedad: null, corriente: null };
    throw e;
  }
}

async function pedirMedicionesHistoricas(dispositivo) {
  const r = await api('GET', `/api/sensores/${encodeURIComponent(dispositivo)}/datos`,
    { query: { id_usuario: obtenerIdUsuario() } });
  return r.datos;
}

async function pedirHistorial(dispositivo, tipo, rango) {
  if (MODO_PRUEBA) return historialDePrueba(tipo);
  const datos = await pedirMedicionesHistoricas(dispositivo);
  let clave = tipo;
  if (tipo === 'corriente') {
    clave = 'conductividad';
  }
  const dia = 24 * 3600 * 1000;
  let edades;
  if (rango === '30s') {
    edades = [30_000, 20_000, 10_000, 5_000, 0];
  } else {
    edades = [7 * dia, 5 * dia, 3 * dia, dia, 12 * 3600 * 1000];
  }
  const ventana = edades[0];
  const ahora = Date.now();
  const inicio = ahora - ventana;
  const puntos = edades.map(edad => ahora - edad);
  const tramos = puntos.map((punto, i) => {
    let inicioTramo = inicio;
    if (i > 0) {
      inicioTramo = (puntos[i - 1] + punto) / 2;
    }

    let finTramo = ahora + 1;
    if (i < puntos.length - 1) {
      finTramo = (punto + puntos[i + 1]) / 2;
    }

    return { inicio: inicioTramo, fin: finTramo };
  });
  const sumas = Array(5).fill(0);
  const cuentas = Array(5).fill(0);
  datos.forEach(d => {
    let t;
    if (typeof d.dia_hora === 'number') {
      t = d.dia_hora;
    } else {
      t = new Date(d.dia_hora).getTime();
    }
    const original = d.medidas_tierras && d.medidas_tierras[clave];
    const v = Number(original);
    if (original === null || original === undefined || original === '' ||
        !Number.isFinite(t) || !Number.isFinite(v) || t < inicio || t > ahora + 5 * 60 * 1000) return;
    const tiempo = Math.min(t, ahora);
    const i = tramos.findIndex((tramo, indice) => {
      if (tiempo < tramo.inicio) {
        return false;
      }
      if (indice === tramos.length - 1) {
        return tiempo <= tramo.fin;
      }
      return tiempo < tramo.fin;
    });
    if (i < 0) return;
    sumas[i] += v;
    cuentas[i]++;
  });
  return sumas.map((s, i) => {
    if (cuentas[i] > 0) {
      return s / cuentas[i];
    }
    return null;
  });
}

async function pedirNotificaciones() {
  const r = await api('GET', '/api/notificaciones', { query: { id_usuario: obtenerIdUsuario() } });
  return r.notificaciones;
}

function configurarEdicionUsuario({ dato, idNuevo, idConfirmar, idContraActual }) {
  const idUsuario = requerirSesion();
  if (!idUsuario) return;
  const leer = (id) => document.getElementById(id).value.trim();

  document.getElementById('boton-circulo').addEventListener('click', () => {
    window.location.href = PAGINAS.perfil;
  });
  document.getElementById('cerrar-sesion').addEventListener('click', cerrarSesion);

  document.getElementById('link-regresar').addEventListener('click', async (e) => {
    e.preventDefault();
    const nuevo = leer(idNuevo);
    const confirmar = leer(idConfirmar);
    const actual = leer(idContraActual);
    if (!nuevo || !confirmar || !actual) {
      alert('Completá todos los campos');
      return;
    }
    try {
      await api('PUT', '/api/auth/usuario', {
        body: {
          id_usuario: idUsuario,
          contraseñaActual: actual,
          dato: dato,
          nuevoValor: nuevo,
          confirmarValor: confirmar
        }
      });
      window.location.href = PAGINAS.home;
    } catch (err) {
      alert(err.message);
    }
  });
}