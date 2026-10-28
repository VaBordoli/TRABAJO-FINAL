document.addEventListener('DOMContentLoaded', () => {

    // 1) Dirección del programa externo que manda los datos (CAMBIALA por la real).
    //    Se espera un JSON así: { "temperatura": 67, "humedad": 67 }
    const URL_DATOS = 'http://localhost:5000/datos';
    const INTERVALO = 5000; // cada cuántos ms se vuelve a pedir el dato
  
    const spanNombre = document.getElementById('nombreCampo');
    const spanTemperatura = document.getElementById('valorTemperatura');
    const spanHumedad = document.getElementById('valorHumedad');
    const textoEstado = document.getElementById('estado');
    const botonCirculo = document.getElementById('boton-circulo');
  
    // 2) Igual que en tu lista.js: leemos los parámetros de la URL
    const params = new URLSearchParams(window.location.search);
  
    function obtenerItemsDeUrl() {
      const itemsParam = params.get('items');
      return itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : [];
    }
  
    spanNombre.textContent = params.get('parcela') || 'XXXXXXX';
  
    // 3) fetch: pide los datos y los escribe en las tarjetas
    async function cargarDatos() {
      try {
        const respuesta = await fetch(URL_DATOS);
        if (!respuesta.ok) throw new Error('Error ' + respuesta.status);
  
        const datos = await respuesta.json();
  
        spanTemperatura.textContent = datos.temperatura;
        spanHumedad.textContent = datos.humedad;
  
        textoEstado.textContent = 'Actualizado ' + new Date().toLocaleTimeString('es-AR');
        textoEstado.classList.remove('error');
      } catch (error) {
        spanTemperatura.textContent = '--';
        spanHumedad.textContent = '--';
        textoEstado.textContent = 'No se pudo conectar con el programa de datos';
        textoEstado.classList.add('error');
        console.error(error);
      }
    }
  
    cargarDatos();
    setInterval(cargarDatos, INTERVALO);
  
    // 4) Interruptores: marcan cuál está activo dentro de su grupo
    document.querySelectorAll('.grupo').forEach(grupo => {
      grupo.addEventListener('click', (e) => {
        const boton = e.target.closest('.pildora');
        if (!boton) return;
        grupo.querySelectorAll('.pildora').forEach(b => b.classList.remove('activa'));
        boton.classList.add('activa');
      });
    });
  
     // 5) El círculo del logo vuelve a la Home, conservando los items
  botonCirculo.addEventListener('click', () => {
    const nuevos = new URLSearchParams();
    nuevos.set('items', encodeURIComponent(JSON.stringify(obtenerItemsDeUrl())));
    window.location.href = 'Home.html?' + nuevos.toString();
  });
  });