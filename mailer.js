const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function enviarCorreo(destino, asunto, texto) {
  try {
    const info = await transporter.sendMail({
      from: `"FestQuest" <${process.env.EMAIL_USER}>`,
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