document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const nombreParcela = params.get('parcela') || '';
    const itemsParam = params.get('items');
  
    document.getElementById('titulo-informacion').textContent = `Información de ${nombreParcela}`;
  
    const linkRegresar = document.getElementById('link-regresar');
    if (itemsParam) {
      const regresoParams = new URLSearchParams();
      regresoParams.set('items', itemsParam);
      linkRegresar.href = 'Home.html?' + regresoParams.toString();
    }
  });