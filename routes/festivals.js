const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    // 1. Leemos los parámetros que vienen de la App
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const depto = req.query.departamento || "";

    // 2. Calculamos el OFFSET (cuántos registros saltar)
    const offset = (page - 1) * pageSize;

    let query = `
      SELECT id, nombre, fecha_inicio, fecha_fin, municipio_nombre, departamento 
      FROM festivals
    `;
    let params = [];

    // 3. Si mandas un departamento, filtramos en la base de datos
    if (depto) {
      query += " WHERE departamento ILIKE $1";
      params.push(`%${depto}%`);
    }

    // 4. Agregamos el Orden, el Límite y el Salto (OFFSET)
    // Usamos $1, $2, etc., para evitar ataques y errores
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    query += ` ORDER BY fecha_inicio ASC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
    
    params.push(pageSize, offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      page: page,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error("ERROR festivals:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;