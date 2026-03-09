const express = require('express');
const cors = require('cors');
const db = require('./db');
const debugRoutes = require('./src/routes/debugColombia');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/debug', debugRoutes);

app.get('/', (req, res) => {
    res.send('Servidor de FestQuest funcionando');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});