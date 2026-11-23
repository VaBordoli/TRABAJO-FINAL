document.addEventListener('DOMContentLoaded', () => {
  if (!requerirSesion()) return;

  const params = new URLSearchParams(window.location.search);
  const parcela = params.get('parcela') || '';
  const idCampo = params.get('id') || '';
  const dispositivo = params.get('dispositivo') || '';

  document.getElementById('nombre-campo').textContent = parcela;

  function mostrar(id, valor) {
    document.getElementById(id).textContent = valor === null || valor === undefined ? '--' : valor;
  }

  async function cargarDatos() {
    try {
      const datos = await pedirValorActual(dispositivo);
      mostrar('temperatura', datos.temperatura);
      mostrar('humedad', datos.humedad);
      mostrar('corriente', datos.corriente);
    } catch (error) {
      mostrar('temperatura', null);
      mostrar('humedad', null);
      mostrar('corriente', null);
      console.error(error);
    }
  }

  cargarDatos();
  setInterval(cargarDatos, 5000);

  document.getElementById('boton-circulo').addEventListener('click', () => {
    window.location.href = PAGINAS.home;
  });

  document.getElementById('boton-informacion').addEventListener('click', () => {
    const nuevos = new URLSearchParams();
    nuevos.set('id', idCampo);
    nuevos.set('parcela', parcela);
    nuevos.set('dispositivo', dispositivo);
    window.location.href = PAGINAS.informacion + '?' + nuevos.toString();
  });
});