// Cambia la ruta de bienvenida para estar 100% seguros
app.get("/", (req, res) => {
  res.json({ 
    mensaje: "REINTENTO TOTAL: USANDO PUNTO SIMPLE",
    db_path: "./db",
    timestamp: "NUEVO_INTENTO_" + new Date().getTime() 
  });
});

// ASEGÚRATE DE QUE ESTO TENGA UN SOLO PUNTO
const db = require("./db");