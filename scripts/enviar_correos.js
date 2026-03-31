const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const csvPath = path.join(__dirname, "..", "data", "correos_alcaldias.csv");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generarMensaje(municipio) {
  return `
Cordial saludo,

Mi nombre es David Támara y represento FestQuest, una plataforma tecnológica orientada a la promoción de los municipios de Colombia a través de sus festivales y oferta turística.

Hemos identificado a ${municipio} como un territorio con alto potencial, y nos gustaría validar información para su inclusión en la plataforma.

Quedamos atentos a su interés.

Cordialmente,
David Támara
FestQuest
https://festquest.app
`;
}

async function run() {
  const data = fs.readFileSync(csvPath, "utf8").split("\n").slice(1);

  let enviados = 0;

  for (const line of data) {
    if (!line.trim()) continue;

    const [municipio, departamento, email] = line.split(",");

    try {
      await transporter.sendMail({
        from: `"FestQuest" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Impulso turístico para ${municipio}`,
        text: generarMensaje(municipio),
      });

      console.log("✔ Enviado:", municipio, email);
      enviados++;

      // ⏱ delay anti-spam
      await delay(60000); // 60 segundos

    } catch (err) {
      console.log("❌ Error:", municipio, err.message);
    }

    if (enviados >= 15) break; // límite diario
  }

  console.log("🚀 Proceso terminado");
}

run();