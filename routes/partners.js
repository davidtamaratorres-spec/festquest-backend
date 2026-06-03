const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/partners/register
router.post("/register", async (req, res) => {
  try {
    const { nombre, email, password, telefono } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        error: "nombre, email y password son obligatorios",
      });
    }

    const result = await db.query(
      `
      INSERT INTO partner_users (
        nombre,
        email,
        password,
        telefono
      )
      VALUES ($1,$2,$3,$4)
      RETURNING id, nombre, email, telefono, role, activo
      `,
      [nombre, email.toLowerCase(), password, telefono || null]
    );

    res.status(201).json({
      ok: true,
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Error registrando socio:", err.message);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Ese correo ya está registrado",
      });
    }

    res.status(500).json({ error: err.message });
  }
});

// POST /api/partners/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "email y password son obligatorios",
      });
    }

    const result = await db.query(
      `
      SELECT id, nombre, email, telefono, role, activo
      FROM partner_users
      WHERE email = $1
        AND password = $2
        AND activo = true
      LIMIT 1
      `,
      [email.toLowerCase(), password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    res.json({
      ok: true,
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Error login socio:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/partners/restaurants
router.post("/restaurants", async (req, res) => {
  try {
    const {
      user_id,
      nombre,
      descripcion,
      ciudad,
      municipio,
      departamento,
      codigo_dane,
      direccion,
      whatsapp,
      telefono,
      logo_url,
      portada_url,
      categoria,
    } = req.body;

    if (!user_id || !nombre) {
      return res.status(400).json({
        error: "user_id y nombre del restaurante son obligatorios",
      });
    }

    const user = await db.query(
      `
      SELECT id
      FROM partner_users
      WHERE id = $1
        AND activo = true
      LIMIT 1
      `,
      [user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        error: "Socio no encontrado",
      });
    }

    const result = await db.query(
      `
      INSERT INTO partner_restaurants (
        user_id,
        nombre,
        descripcion,
        ciudad,
        municipio,
        departamento,
        codigo_dane,
        direccion,
        whatsapp,
        telefono,
        logo_url,
        portada_url,
        categoria
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
      `,
      [
        user_id,
        nombre,
        descripcion || "",
        ciudad || municipio || "",
        municipio || ciudad || "",
        departamento || "",
        codigo_dane || null,
        direccion || "",
        whatsapp || "",
        telefono || "",
        logo_url || "",
        portada_url || "",
        categoria || "",
      ]
    );

    res.status(201).json({
      ok: true,
      restaurant: result.rows[0],
    });
  } catch (err) {
    console.error("Error creando restaurante socio:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/partners/:user_id/restaurants
router.get("/:user_id/restaurants", async (req, res) => {
  try {
    const userId = Number(req.params.user_id);

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({
        error: "user_id inválido",
      });
    }

    const result = await db.query(
      `
      SELECT *
      FROM partner_restaurants
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error listando restaurantes socio:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;