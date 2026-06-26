const { Pool } = require('pg');
const https = require('https');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url) return resolve({ valid: false, size: 0 });
    try {
      const req = https.get(url, { timeout: 8000 }, (res) => {
        const contentType = res.headers['content-type'] || '';
        let size = 0;
        res.on('data', chunk => { size += chunk.length; if (size > 500) { req.destroy(); resolve({ valid: true, size }); } });
        res.on('end', () => resolve({ valid: size > 500 && contentType.includes('image'), size }));
      });
      req.on('error', () => resolve({ valid: false, size: 0 }));
      req.on('timeout', () => { req.destroy(); resolve({ valid: false, size: 0 }); });
    } catch(e) { resolve({ valid: false, size: 0 }); }
  });
}

async function run() {
  const { rows } = await pool.query(
    'SELECT id, nombre, escudo_url, bandera_url FROM municipalities WHERE escudo_url IS NOT NULL OR bandera_url IS NOT NULL'
  );
  console.log(`Validando ${rows.length} municipios...`);
  let nullifiedEscudo = 0, nullifiedBandera = 0;

  for (const row of rows) {
    const [escudo, bandera] = await Promise.all([
      checkUrl(row.escudo_url),
      checkUrl(row.bandera_url)
    ]);
    if (row.escudo_url && !escudo.valid) {
      await pool.query('UPDATE municipalities SET escudo_url = NULL WHERE id = $1', [row.id]);
      nullifiedEscudo++;
      console.log(`ESCUDO NULL: ${row.nombre} (${escudo.size} bytes)`);
    }
    if (row.bandera_url && !bandera.valid) {
      await pool.query('UPDATE municipalities SET bandera_url = NULL WHERE id = $1', [row.id]);
      nullifiedBandera++;
      console.log(`BANDERA NULL: ${row.nombre} (${bandera.size} bytes)`);
    }
  }
  console.log(`\nResumen: ${nullifiedEscudo} escudos, ${nullifiedBandera} banderas nullificadas`);
  await pool.end();
}
run();
