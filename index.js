const express = require('express');
const cors = require('cors');
const db = require('./db');
const debugRoutes = require('./routes/debugColombia');

const app = express();
app.use(cors()); // Permiso universal
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.use('/debug', debugRoutes);

app.get('/', (req, res) => {
    res.send('Servidor FestQuest Activo');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor en puerto ${PORT}`);
});