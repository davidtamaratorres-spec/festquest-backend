fetch('/api/festivals')
  .then(res => res.json())
  .then(data => {

    const bloque = document.createElement('div');
    bloque.style.marginTop = '20px';

    const filtrados = data.filter(f => {
      if (!f.fecha) return false;

      const fecha = f.fecha.toLowerCase();

      return (
        fecha.includes('04') ||
        fecha.includes('05') ||
        fecha.includes('abril') ||
        fecha.includes('mayo')
      );
    }).slice(0, 6);

    bloque.innerHTML = `
      <strong>Abril y Mayo 2026:</strong>
      ${
        filtrados.length === 0
          ? '<div>No hay datos visibles</div>'
          : filtrados.map(f =>
              `<div>🎉 ${f.nombre} – ${f.municipio || ''}</div>`
            ).join('')
      }
    `;

    const hero = document.querySelector('.hero');
    if (hero) hero.appendChild(bloque);

  });