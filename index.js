const express = require('express');
const cors = require('cors');
const db = require('./db');
// Corregimos la ruta para que apunte a donde realmente está el archivo
const debugRoutes = require('./routes/debugColombia');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/debug', debugRoutes);

app.get('/', (req, res) => {
    res.send('Servidor de FestQuest funcionando correctamente');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});