router.get("/colombia-counts", async (req, res) => {
  try {
    // Esta consulta nos dirá si las tablas existen siquiera
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const munCount = await db.query("SELECT COUNT(*) FROM municipios");
    const festCount = await db.query("SELECT COUNT(*) FROM festivals");

    res.json({
      tablas_encontradas: tables.rows.map(t => t.table_name),
      municipios: munCount.rows[0].count,
      festivales: festCount.rows[0].count,
      status: "Conectado a PostgreSQL en Render"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});