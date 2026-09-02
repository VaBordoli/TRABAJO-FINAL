document.addEventListener('DOMContentLoaded', () => {
    const itemsListaGrande = document.querySelectorAll('.lista-grande .item-lista');
    const botones = document.querySelectorAll('.fila-botones .enlace-boton');
    const primerosTres = Array.from(botones).slice(0, 3);
    const listaGrande = document.querySelector('.lista-grande');
  
    primerosTres.forEach(boton => boton.classList.add('deshabilitado'));
  
    itemsListaGrande.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        itemsListaGrande.forEach(i => i.classList.remove('seleccionado'));
        item.classList.add('seleccionado');
        primerosTres.forEach(boton => boton.classList.remove('deshabilitado'));
      });
    });
  
    document.addEventListener('click', (e) => {
      if (!listaGrande.contains(e.target)) {
        itemsListaGrande.forEach(i => i.classList.remove('seleccionado'));
        primerosTres.forEach(boton => boton.classList.add('deshabilitado'));
      }
    });
  });