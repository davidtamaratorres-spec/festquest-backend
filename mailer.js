 const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.privateemail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function enviarCorreo(destino, asunto, texto) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"FestQuest" <gerencia@festquest.app>`,
      to: destino,
      subject: asunto,
      text: texto,
    });

    console.log("Correo enviado:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error correo:", error);
    return false;
  }
}

module.exports = { enviarCorreo };