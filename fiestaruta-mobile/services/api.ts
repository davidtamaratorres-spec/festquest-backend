// Cambia esto en todos tus archivos de la carpeta services
const BASE_URL = 'https://festquest-backend.onrender.com';

export async function pingBackend() {
  // LA RUTA CORRECTA SEGÚN TU BACKEND:
  const url = `${BASE_URL}/festivales`; 
  
  try {
    const r = await fetch(url);
    const j = await r.json();
    return j;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}