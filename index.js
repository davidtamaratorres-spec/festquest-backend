const express = require('express');
const cors = require('cors');
const db = require('./db');
const debugRoutes = require('./routes/debugColombia');

const app = express();

// Opción A: Permitir que cualquier dispositivo (como tu iPhone) se conecte
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.use('/debug', debugRoutes);

app.get('/', (req, res) => {
    res.send('Servidor FestQuest Conectado y Abierto');
});

// Importante: '0.0.0.0' permite conexiones externas en Render
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});