document.addEventListener('DOMContentLoaded', () => {

  const params = new URLSearchParams(window.location.search);
  const parcela = params.get('parcela');

  document.getElementById('nombre-campo').textContent = parcela || '';

  // Pone el número en pantalla, o -- si no hay dato
  function mostrar(id, valor) {
    document.getElementById(id).textContent = valor === null ? '--' : valor;
  }

  async function cargarDatos() {
    try {
      const datos = await pedirValorActual(parcela);
      mostrar('temperatura', datos.temperatura);
      mostrar('humedad', datos.humedad);
    } catch (error) {
      mostrar('temperatura', null);
      mostrar('humedad', null);
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

  // Cuarto botón: va a Informacion
  document.getElementById('boton-informacion').addEventListener('click', () => {
    const nuevos = new URLSearchParams();
    nuevos.set('parcela', parcela || '');
    nuevos.set('items', params.get('items') || '');
    window.location.href = 'Informacion.html?' + nuevos.toString();
  });
});