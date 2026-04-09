fetch('/api/festivals')
  .then(res => res.json())
  .then(data => {

    const filtrados = data.filter(f =>
      f.date_start &&
      (f.date_start.startsWith('2026-04') || f.date_start.startsWith('2026-05'))
    ).slice(0, 20);

    console.log('Festivales:', filtrados);

  });