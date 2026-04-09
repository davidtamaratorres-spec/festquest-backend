document.addEventListener('DOMContentLoaded', () => {

  const boton = document.querySelector('.hero-card li');

  if (!boton) return;

  const panel = document.createElement('div');
  panel.style.marginTop = '15px';
  panel.style.display = 'none';

  boton.style.cursor = 'pointer';

  boton.addEventListener('click', () => {

    if (panel.style.display === 'block') {
      panel.style.display = 'none';
      return;
    }

    fetch('/api/festivals')
      .then(res => res.json())
      .then(data => {

        const ordenados = data
          .filter(f => f.date_start)
          .sort((a,b) => new Date(a.date_start) - new Date(b.date_start))
          .slice(0, 20);

        panel.innerHTML = `
          <div style="background:white; padding:10px; border-radius:10px;">
            <strong>Próximos festivales</strong>
            ${ordenados.map(f => `
              <div style="margin-top:6px;">
                📅 ${new Date(f.date_start).toLocaleDateString()} 
                — ${f.nombre} — ${f.municipio}
              </div>
            `).join('')}
          </div>
        `;

        boton.appendChild(panel);
        panel.style.display = 'block';

      });

  });

});