document.getElementById('form-agregar').addEventListener('submit', (e) => {
    e.preventDefault();
  
    const nombreParcela = document.getElementById('nombre-parcela').value;
  
    const urlParams = new URLSearchParams(window.location.search);
    const itemsParam = urlParams.get('items');
    const itemsExistentes = itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : [];
  
    itemsExistentes.push({ parcela: nombreParcela });
  
    const params = new URLSearchParams();
    params.set('items', encodeURIComponent(JSON.stringify(itemsExistentes)));
  
    window.location.href = 'Home.html?' + params.toString();
  });