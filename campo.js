document.addEventListener('DOMContentLoaded', () => {

  // Dirección del programa que manda los datos (cambiala por la real).
  // Tiene que responder algo así: { "temperatura": 67, "humedad": 67 }
  const URL_DATOS = 'http://localhost:5000/datos';

  const params = new URLSearchParams(window.location.search);
  const parcela = params.get('parcela');

  // Nombre del campo en el título
  document.getElementById('nombre-campo').textContent = parcela || '';

  // NUEVO: guarda el valor y rearma el aviso si ya volvió a estar en rango
  function guardarYRevisar(tipo, valor) {
    valor = Number(valor);
    localStorage.setItem(`${parcela}: Valor ${tipo}`, valor);

    const min = Number(localStorage.getItem(`${parcela}: ${tipo} Min`));
    const max = Number(localStorage.getItem(`${parcela}: ${tipo} Max`));
    const nombre = tipo.toLowerCase();

    // Si ya NO está pasado del máximo, se borra la marca de "descartada"
    if (!(max > 0 && valor > max)) {
      localStorage.removeItem(`Descartada: ${parcela}|${nombre}|max`);
    }
    // Si ya NO está por debajo del mínimo, se borra la marca de "descartada"
    if (!(valor < min)) {
      localStorage.removeItem(`Descartada: ${parcela}|${nombre}|min`);
    }
  }

  // Pide los datos y los pone en las tarjetas
  async function cargarDatos() {
    try {
      const respuesta = await fetch(URL_DATOS);
      const datos = await respuesta.json();

      document.getElementById('temperatura').textContent = datos.temperatura;
      document.getElementById('humedad').textContent = datos.humedad;

      // NUEVO
      guardarYRevisar('Temperatura', datos.temperatura);
      guardarYRevisar('Humedad', datos.humedad);
    } catch (error) {
      document.getElementById('temperatura').textContent = '--';
      document.getElementById('humedad').textContent = '--';
      console.error(error);
    }
  }

  cargarDatos();
  setInterval(cargarDatos, 5000);

  // Logo: vuelve a la Home
  document.getElementById('boton-circulo').addEventListener('click', () => {
    const nuevos = new URLSearchParams();
    nuevos.set('items', params.get('items') || '');
    window.location.href = 'Home.html?' + nuevos.toString();
  });

  // Cuarto botón (el último de la derecha): va a Informacion
  document.getElementById('boton-informacion').addEventListener('click', () => {
    const nuevos = new URLSearchParams();
    nuevos.set('parcela', parcela || '');
    nuevos.set('items', params.get('items') || '');
    window.location.href = 'Informacion.html?' + nuevos.toString();
  });
});