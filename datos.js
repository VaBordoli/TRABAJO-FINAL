// ============================================================
// datos.js: ÚNICO lugar donde se consiguen los datos de las parcelas.
// Lo usan Home, Informacion y campo. Se carga ANTES que el JS de cada página.
// ============================================================

// true = inventa datos para probar sin programa externo
const MODO_PRUEBA = true;

// Dirección del programa que envía los datos (cambiala por la tuya).
// Se le pide:  ?parcela=nbl&tipo=temperatura&rango=24h
// Tiene que responder:  { "valores": [n1, n2, n3, n4, n5, n6, n7] }  (o directamente el array)
const API_URL = 'http://localhost:3000/api/datos';

// Entre qué números se inventan los datos en modo prueba [mínimo, máximo]
const RANGOS_PRUEBA = {
  temperatura: [0, 40],
  humedad: [0, 100]
};

// ---------- Funciones chicas de ayuda ----------

// 'temperatura' -> 'Temperatura' (así se llaman las claves del localStorage)
function nombreClave(tipo) {
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

// Número entero al azar entre min y max
function numeroAlAzar(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

// Lee el último valor guardado de una parcela (o null si no hay)
function leerValorGuardado(parcela, tipo) {
  const valor = localStorage.getItem(`${parcela}: Valor ${nombreClave(tipo)}`);
  return valor === null ? null : Number(valor);
}

// Guarda el valor actual para que la Home lo compare con el mínimo y el máximo.
// Además, si el valor ya volvió a estar en rango, borra la marca de "notificación
// descartada", así si se vuelve a pasar el aviso llega de nuevo.
function guardarValor(parcela, tipo, valor) {
  const nombre = nombreClave(tipo);
  localStorage.setItem(`${parcela}: Valor ${nombre}`, valor);

  const min = Number(localStorage.getItem(`${parcela}: ${nombre} Min`));
  const max = Number(localStorage.getItem(`${parcela}: ${nombre} Max`));

  if (!(max > 0 && valor > max)) {
    localStorage.removeItem(`Descartada: ${parcela}|${tipo}|max`);
  }
  if (!(valor < min)) {
    localStorage.removeItem(`Descartada: ${parcela}|${tipo}|min`);
  }
}

// ---------- Para el gráfico (Informacion) ----------

// Devuelve SIEMPRE una lista de 7 valores (null = punto vacío).
//   tipo:  'temperatura' o 'humedad'
//   rango: '24h' o '7d'
async function pedirHistorial(parcela, tipo, rango) {

    if (MODO_PRUEBA) {
        const [min, max] = RANGOS_PRUEBA[tipo];
    
        // Los primeros 6 puntos se inventan
        const valores = Array.from({ length: 6 }, () => min + Math.random() * (max - min) * 0.6 + (max - min) * 0.1);
    
        // El último punto ("Ahora" / "Hoy") es una lectura nueva cada vez.
        // Se guarda, así la Home la ve y puede avisar si se pasó de los límites.
        const ahora = numeroAlAzar(min, max);
        guardarValor(parcela, tipo, ahora);
        valores.push(ahora);
    
        return valores;
      }
  const url = `${API_URL}?${new URLSearchParams({ parcela: parcela, tipo: tipo, rango: rango })}`;

  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
  const datos = await respuesta.json();
  const lista = Array.isArray(datos) ? datos : datos.valores;
  if (!Array.isArray(lista)) throw new Error('Formato inesperado');

  return Array.from({ length: 7 }, (_, i) => {
    const n = parseFloat(lista[i]);
    return Number.isFinite(n) ? n : null;
  });
}

// ---------- Para la Home y campo ----------

// Devuelve { temperatura, humedad } con los valores de ahora y los guarda.
async function pedirValorActual(parcela) {
  let datos;

  if (MODO_PRUEBA) {
    const t = RANGOS_PRUEBA.temperatura;
    const h = RANGOS_PRUEBA.humedad;
    datos = {
      temperatura: numeroAlAzar(t[0], t[1]),
      humedad: numeroAlAzar(h[0], h[1])
    };
  } else {
    // El valor actual es el último punto del historial de 24 horas
    const temperaturas = await pedirHistorial(parcela, 'temperatura', '24h');
    const humedades = await pedirHistorial(parcela, 'humedad', '24h');
    datos = { temperatura: temperaturas[6], humedad: humedades[6] };
  }

  if (datos.temperatura !== null) guardarValor(parcela, 'temperatura', datos.temperatura);
  if (datos.humedad !== null) guardarValor(parcela, 'humedad', datos.humedad);

  return datos;
}