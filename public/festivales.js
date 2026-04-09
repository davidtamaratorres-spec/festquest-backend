fetch('/api/festivals')
  .then(res => res.json())
  .then(data => {

    const filtrados = data.filter(f => {
      if (!f.fecha) return false;

      const fecha = f.fecha.toLowerCase();

      return (
        fecha.includes('04') ||
        fecha.includes('05') ||
        fecha.includes('abril') ||
        fecha.includes('mayo')
      );
    });

    console.log('Festivales Abril/Mayo:', filtrados);

  });