router.get("/", async (req, res) => {
  // 1. Usamos query en lugar de params para que la ruta / sea válida
  const { municipio_id } = req.query; 

  try {
    // 2. Consulta limpia a la tabla 'festivales' (la que vimos en Render)
    let query = 'SELECT * FROM festivales'; 
    let params = [];

    // 3. Si alguien filtra, agregamos el WHERE, si no, traemos los 32
    if (municipio_id) {
      query += ' WHERE "Código_id"::text = $1 OR municipio ILIKE $1';
      params = [municipio_id];
    }

    const result = await db.query(query, params);
    
    // 4. Enviamos siempre el formato que tu App espera
    res.json({ success: true, data: result.rows });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: "Error en la tabla festivales" });
  }
});