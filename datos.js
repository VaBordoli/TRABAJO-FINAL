// ===== Capa de comunicación con el back (compartida por todas las páginas) =====
const API_URL = 'http://localhost:3000';
const MODO_PRUEBA = true; // Cambiar a false para usar las mediciones reales del servidor.
const RANGOS_PRUEBA = {
  temperatura: { valorminimo: 0, valormaximo: 40 },
  humedad: { valorminimo: 0, valormaximo: 100 },
  conductividad: { valorminimo: 0, valormaximo: 20 }
};
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
    entrada.type = mostrar ? 'text' : 'password';
    boton.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
    boton.setAttribute('aria-pressed', String(mostrar));
    icono.src = mostrar ? 'img/contrasena-visible.png' : 'img/contrasena-oculta.png';
  });
  return ocultar;
}
function valorDePrueba(tipo) {
  const clave = tipo === 'corriente' ? 'conductividad' : tipo;
  const { valorminimo, valormaximo } = RANGOS_PRUEBA[clave];
  return Number((valorminimo + Math.random() * (valormaximo - valorminimo)).toFixed(1));
}
function historialDePrueba(tipo) {
  const clave = tipo === 'corriente' ? 'conductividad' : tipo;
  const { valorminimo, valormaximo } = RANGOS_PRUEBA[clave];
  const amplitud = valormaximo - valorminimo;
  const valores = Array.from({ length: 7 }, (_, i) => {
    const proporcion = 0.1 + (0.8 * i) / 6 + (Math.random() - 0.5) * 0.05;
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

// Devuelve 7 valores (promedios por tramo) para el gráfico de Información.
// tipo: 'temperatura' | 'humedad' | 'corriente'; rango: '24h' | '7d'. null = sin datos en ese tramo.
async function pedirHistorial(dispositivo, tipo, rango) {
  if (MODO_PRUEBA) return historialDePrueba(tipo);
  const r = await api('GET', `/api/sensores/${encodeURIComponent(dispositivo)}/datos`,
    { query: { id_usuario: obtenerIdUsuario() } });
  const clave = tipo === 'corriente' ? 'conductividad' : tipo;
  const ventana = (rango === '24h' ? 24 : 24 * 7) * 3600 * 1000;
  const paso = ventana / 6;
  const inicio = Date.now() - ventana;
  const ahora = Date.now();
  const sumas = Array(7).fill(0);
  const cuentas = Array(7).fill(0);
  r.datos.forEach(d => {
    const t = typeof d.dia_hora === 'number' ? d.dia_hora : new Date(d.dia_hora).getTime();
    const original = d.medidas_tierras && d.medidas_tierras[clave];
    const v = Number(original);
    if (original === null || original === undefined || original === '' ||
        !Number.isFinite(t) || !Number.isFinite(v) || t < inicio || t > ahora + 5 * 60 * 1000) return;
    const i = Math.min(6, Math.max(0, Math.round((Math.min(t, ahora) - inicio) / paso)));
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