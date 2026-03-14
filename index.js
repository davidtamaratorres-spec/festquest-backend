const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// --- ESTA FUNCIÓN METE LOS DATOS APENAS SUBAS EL CÓDIGO ---
const cargarMunicipiosYa = async () => {
  try {
    console.log("Revisando base de datos...");
    await db.query(`
      INSERT INTO festivales ("Código_id", municipio, departamento, festival, habitantes, altura)
      VALUES 
      (91001, 'Leticia', 'Amazonas', 'Festival de la Confraternidad Amazónica', '42k', '96m'),
      (5001, 'Medellín', 'Antioquia', 'Feria de las Flores', '2.5M', '1495m'),
      (5030, 'Amagá', 'Antioquia', 'Festival del Carbón', '30k', '1250m'),
      (5129, 'Caldas', 'Antioquia', 'Fiestas del Aguacero', '80k', '1750m')
      ON CONFLICT DO NOTHING;
    `);
    console.log("¡Base de datos lista para usar!");
  } catch (err) {
    console.log("Nota: Los datos ya existían o hubo un aviso:", err.message);
  }
};

// --- RUTA QUE EL MÓVIL BUSCA ---
app.get("/api/festivals", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM festivales");
    // Esto es lo que el móvil recibe
    res.json(result.rows); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Otras rutas para que no den error
app.use("/api/municipalities", require("./routes/municipalities"));
app.use("/api/restaurants", require("./routes/restaurants"));

app.get("/", (req, res) => { res.send("Servidor Funcionando"); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor FestQuest Online");
  cargarMunicipiosYa();
});