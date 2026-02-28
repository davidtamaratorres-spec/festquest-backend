const express = require("express");
const router = express.Router();
const db = require("../db");

const isPostgres = !!db._pool; // en tu wrapper pg exportas _pool

// Helpers para ejecutar queries en ambos motores
function dbGet(sqliteSql, pgSql, params, cb) {
  const sql = isPostgres ? pgSql : sqliteSql;
  db.get(sql, params, cb);
}
function dbAll(sqliteSql, pgSql, params, cb) {
  const sql = isPostgres ? pgSql : sqliteSql;
  db.all(sql, params, cb);
}
function dbRun(sqliteSql, pgSql, params, cb) {
  const sql = isPostgres ? pgSql : sqliteSql;
  db.run(sql, params, cb);
}

// GET /dishes (lista)
router.get("/", (req, res) => {
  const sqliteSql = `
    SELECT
      d.id,
      d.restaurante_id,
      d.nombre,
      d.descripcion,
      d.precio,
      d.categoria,
      d.imagen_url,
      d.disponible,
      r.ciudad
    FROM dishes d
    LEFT JOIN restaurants r ON r.id = d.restaurante_id
    ORDER BY d.id DESC
  `;

  const pgSql = `
    SELECT
      d.id,
      d.restaurante_id,
      d.nombre,
      d.descripcion,
      d.precio,
      d.categoria,
      d.imagen_url,
      d.disponible,
      r.ciudad
    FROM dishes d
    LEFT JOIN restaurants r ON r.id = d.restaurante_id
    ORDER BY d.id DESC
  `;

  dbAll(sqliteSql, pgSql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ✅ GET /dishes/:id (detalle)
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "id inválido" });
  }

  const sqliteSql = `
    SELECT
      d.id,
      d.restaurante_id,
      d.nombre,
      d.descripcion,
      d.precio,
      d.categoria,
      d.imagen_url,
      d.disponible,
      r.ciudad
    FROM dishes d
    LEFT JOIN restaurants r ON r.id = d.restaurante_id
    WHERE d.id = ?
    LIMIT 1
  `;

  const pgSql = `
    SELECT
      d.id,
      d.restaurante_id,
      d.nombre,
      d.descripcion,
      d.precio,
      d.categoria,
      d.imagen_url,
      d.disponible,
      r.ciudad
    FROM dishes d
    LEFT JOIN restaurants r ON r.id = d.restaurante_id
    WHERE d.id = $1
    LIMIT 1
  `;

  dbGet(sqliteSql, pgSql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Plato no encontrado" });
    res.json(row);
  });
});

// POST /dishes
router.post("/", (req, res) => {
  const {
    restaurante_id,
    nombre,
    descripcion = "",
    precio,
    categoria = "",
    imagen_url = "",
    disponible = 1,
  } = req.body || {};

  if (!restaurante_id || !nombre || precio === undefined || precio === null) {
    return res.status(400).json({
      error: "Faltan campos requeridos: restaurante_id, nombre, precio",
    });
  }

  const precioNum = Number(precio);
  if (Number.isNaN(precioNum) || precioNum < 0) {
    return res.status(400).json({ error: "precio inválido" });
  }

  // 1) Verificar restaurante existe
  const sqliteCheck = "SELECT id FROM restaurants WHERE id = ?";
  const pgCheck = "SELECT id FROM restaurants WHERE id = $1";

  dbGet(sqliteCheck, pgCheck, [restaurante_id], (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!r) return res.status(404).json({ error: "Restaurante no existe" });

    // 2) Insertar dish
    const sqliteInsert = `
      INSERT INTO dishes
        (restaurante_id, nombre, descripcion, precio, categoria, imagen_url, disponible)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    // En Postgres devolvemos id con RETURNING
    const pgInsert = `
      INSERT INTO dishes
        (restaurante_id, nombre, descripcion, precio, categoria, imagen_url, disponible)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    dbRun(
      sqliteInsert,
      pgInsert,
      [
        restaurante_id,
        nombre,
        descripcion,
        precioNum,
        categoria,
        imagen_url,
        disponible ? 1 : 0,
      ],
      function (err2, result) {
        if (err2) return res.status(500).json({ error: err2.message });

        const newId = isPostgres ? result?.rows?.[0]?.id : this.lastID;
        res.status(201).json({ ok: true, id: newId ?? null });
      }
    );
  });
});

module.exports = router;
