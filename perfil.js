document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const itemsParam = params.get('items');
  
    const linkRegresar = document.getElementById('link-regresar');
    if (itemsParam) {
      const regresoParams = new URLSearchParams();
      regresoParams.set('items', itemsParam);
      linkRegresar.href = 'Home.html?' + regresoParams.toString();
    }
  });