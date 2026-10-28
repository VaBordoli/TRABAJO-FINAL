document.addEventListener('DOMContentLoaded', () => {

  // Dirección del programa que manda los datos (cambiala por la real).
  // Tiene que responder algo así: { "temperatura": 67, "humedad": 67 }
  const URL_DATOS = 'http://localhost:5000/datos';

  const params = new URLSearchParams(window.location.search);

  // Nombre del campo en el título
  document.getElementById('nombre-campo').textContent = params.get('parcela') || '';

  // Pide los datos y los pone en las tarjetas
  async function cargarDatos() {
    try {
      const respuesta = await fetch(URL_DATOS);
      const datos = await respuesta.json();

      document.getElementById('temperatura').textContent = datos.temperatura;
      document.getElementById('humedad').textContent = datos.humedad;
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
    nuevos.set('parcela', params.get('parcela') || '');
    nuevos.set('items', params.get('items') || '');
    window.location.href = 'Informacion.html?' + nuevos.toString();
  });
});