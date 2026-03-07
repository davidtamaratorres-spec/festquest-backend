const db = require('./db');
const fs = require('fs');

(async () => {
  try {
    const data = fs.readFileSync('data/festivales.xlsx - festivales_raw.csv', 'utf8');
    const lines = data.split('\n').slice(1);
    const uniqueMuns = new Map();

    console.log('Analizando archivo...');
    
    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const mun = parts[0].replace(/"/g, '').trim();
        const dep = parts[1].replace(/"/g, '').trim();
        if (mun && dep) {
          uniqueMuns.set(`${mun}|${dep}`, { mun, dep });
        }
      }
    });

    console.log(`Sincronizando ${uniqueMuns.size} municipios de toda Colombia...`);

    for (const [key, val] of uniqueMuns) {
      await db.query(
        'INSERT INTO municipalities (nombre, departamento) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [val.mun, val.dep]
      );
    }

    console.log('✅ ¡Municipios de toda Colombia creados sin repetidos!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();