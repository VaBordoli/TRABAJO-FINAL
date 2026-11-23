// ===== Capa de comunicación con el back (compartida por todas las páginas) =====
const API_URL = 'http://localhost:3000';
const CLAVE_SESION = 'id_usuario';

// Si algún archivo HTML tiene otro nombre, se cambia SOLO acá.
const PAGINAS = {
  bienvenida: 'Bienvenida.html',
  home: 'Home.html',
  perfil: 'perfil.html',
  campo: 'campo.html',
  informacion: 'Informacion.html',
  editar: 'editar.html',
  agregar: 'lista.html'
};

async function api(metodo, ruta, { query, body } = {}) {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
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
  try { datos = await respuesta.json(); } catch (e) { /* sin cuerpo JSON */ }
  if (!respuesta.ok) {
    const error = new Error((datos && datos.message) || 'Error HTTP ' + respuesta.status);
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}

// ---- Sesión (el back no usa tokens: solo devuelve id_usuario) ----
function guardarSesion(id) { localStorage.setItem(CLAVE_SESION, String(id)); }
function obtenerIdUsuario() {
  const n = Number(localStorage.getItem(CLAVE_SESION));
  return n > 0 ? n : null;
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

// ---- Campos ----
async function listarCampos() {
  const r = await api('GET', '/api/campos', { query: { id_usuario: obtenerIdUsuario() } });
  return r.campos;
}
async function pedirRangos(idCampo) {
  try {
    const r = await api('GET', `/api/campos/${idCampo}/valores-predeterminados`,
      { query: { id_usuario: obtenerIdUsuario() } });
    return r.valores; // { humedad:{valorminimo,valormaximo}, temperatura:{...}, conductividad:{...} }
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

// ---- Sensores ----
// "corriente" en el front = "conductividad" en el back
async function pedirValorActual(dispositivo) {
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

// Devuelve 7 valores (promedios por tramo) para el gráfico de Información.
// tipo: 'temperatura' | 'humedad' | 'corriente'; rango: '24h' | '7d'. null = sin datos en ese tramo.
async function pedirHistorial(dispositivo, tipo, rango) {
  const r = await api('GET', `/api/sensores/${encodeURIComponent(dispositivo)}/datos`,
    { query: { id_usuario: obtenerIdUsuario() } });
  const clave = tipo === 'corriente' ? 'conductividad' : tipo;
  const ventana = (rango === '24h' ? 24 : 24 * 7) * 3600 * 1000;
  const paso = ventana / 6;
  const inicio = Date.now() - ventana;
  const sumas = Array(7).fill(0);
  const cuentas = Array(7).fill(0);
  r.datos.forEach(d => {
    const t = new Date(d.dia_hora).getTime();
    const v = Number(d.medidas_tierras[clave]);
    if (!Number.isFinite(t) || !Number.isFinite(v)) return;
    const i = Math.round((t - inicio) / paso);
    if (i < 0 || i > 6) return;
    sumas[i] += v;
    cuentas[i]++;
  });
  return sumas.map((s, i) => cuentas[i] ? s / cuentas[i] : null);
}

// ---- Notificaciones ----
async function pedirNotificaciones() {
  const r = await api('GET', '/api/notificaciones', { query: { id_usuario: obtenerIdUsuario() } });
  return r.notificaciones;
}

// ---- Pantallas Editar-Nombre / Editar-Mail / Editar-Contra ----
function configurarEdicionUsuario({ dato, idNuevo, idConfirmar, idContraActual }) {
  const idUsuario = requerirSesion();
  if (!idUsuario) return;
  const leer = (id) => document.getElementById(id).value.trim();

  document.getElementById('boton-circulo').addEventListener('click', () => {
    window.location.href = PAGINAS.perfil;
  });
  document.getElementById('cerrar-sesion').addEventListener('click', cerrarSesion);

  // el <a href="Home.html"> navegaba sin guardar: se frena y se hace el PUT
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