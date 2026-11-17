const MODO_PRUEBA = true;


const API_URL = 'http://localhost:3000/api/datos';

const RANGOS_PRUEBA = {
  temperatura: [0, 40],
  humedad: [0, 100],
  corriente: [0, 20]
};


function nombreClave(tipo) {
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

function numeroAlAzar(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function leerValorGuardado(parcela, tipo) {
  const valor = localStorage.getItem(`${parcela}: Valor ${nombreClave(tipo)}`);
  return valor === null ? null : Number(valor);
}


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



async function pedirHistorial(parcela, tipo, rango) {

    if (MODO_PRUEBA) {
        const [min, max] = RANGOS_PRUEBA[tipo];
    
        const valores = Array.from({ length: 6 }, () => min + Math.random() * (max - min) * 0.6 + (max - min) * 0.1);
    
        
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


async function pedirValorActual(parcela) {
  let datos;

  if (MODO_PRUEBA) {
    const t = RANGOS_PRUEBA.temperatura;
    const h = RANGOS_PRUEBA.humedad;
    const c = RANGOS_PRUEBA.corriente;
    datos = {
      temperatura: numeroAlAzar(t[0], t[1]),
      humedad: numeroAlAzar(h[0], h[1]),
      corriente: numeroAlAzar(c[0], c[1])
    };
  } else {
    const temperaturas = await pedirHistorial(parcela, 'temperatura', '24h');
    const humedades = await pedirHistorial(parcela, 'humedad', '24h');
    const corrientes = await pedirHistorial(parcela, 'corriente', '24h');
    datos = {
      temperatura: temperaturas[6],
      humedad: humedades[6],
      corriente: corrientes[6]
    };
  }

  if (datos.temperatura !== null) guardarValor(parcela, 'temperatura', datos.temperatura);
  if (datos.humedad !== null) guardarValor(parcela, 'humedad', datos.humedad);
  if (datos.corriente !== null) guardarValor(parcela, 'corriente', datos.corriente);

  return datos;
}