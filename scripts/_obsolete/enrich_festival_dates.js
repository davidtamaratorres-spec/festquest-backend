const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ===============================
// REGLA: MAPEO REAL (EDITABLE)
// ===============================

const fechasManual = {
  "feria de las flores": ["2026-08-01", "2026-08-10"],
  "fiestas de medellin": ["2026-08-01", "2026-08-10"],
  "fiestas de cartagena": ["2026-11-10", "2026-11-20"],
};

// ===============================
function normalize(text) {
  return text
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ===============================
async function run() {
  console.log("📅 ENRIQUECIENDO FECHAS");

  const result = await pool.query(`
    SELECT id, nombre
    FROM festivals
    WHERE date_start IS NULL
  `);

  let updated = 0;

  for (const row of result.rows) {
    const name = normalize(row.nombre);

    if (!name) continue;

    let match = null;

    for (const key in fechasManual) {
      if (name.includes(key)) {
        match = fechasManual[key];
        break;
      }
    }

    if (!match) continue;

    await pool.query(
      `
      UPDATE festivals
      SET date_start = $2,
          date_end = $3,
          year = 2026,
          status = 'confirmado',
          verified = true
      WHERE id = $1
      `,
      [row.id, match[0], match[1]]
    );

    updated++;
  }

  console.log("✅ Fechas cargadas:", updated);
  process.exit();
}

run();