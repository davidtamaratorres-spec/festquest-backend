const express = require('express');
const router = express.Router();
const db = require('../../db');

router.get("/colombia-counts", async (req, res) => {
    try {
        const result = await db.query('SELECT COUNT(*) FROM festivals');
        res.json({ 
            success: true, 
            count: result.rows[0].count,
            message: "Conexión exitosa con la base de datos" 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;