fetch('/api/festivals')
  .then(res => res.json())
  .then(data => {

    const filtrados = data
      .filter(f => f.fecha && (f.fecha.includes('2026-04') || f.fecha.includes('2026-05')))
      .slice(0, 6);

    const bloque = document.createElement('div');
    bloque.style.marginTop = '20px';

    bloque.innerHTML = `
      <strong>Abril y Mayo 2026:</strong>
      ${filtrados.map(f =>
        `<div>🎉 ${f.nombre} – ${f.municipio || ''}</div>`
      ).join('')}
    `;

    const hero = document.querySelector('.hero');
    if (hero) hero.appendChild(bloque);

  });