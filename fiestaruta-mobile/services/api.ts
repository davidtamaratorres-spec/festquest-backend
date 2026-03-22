const BASE_URL = "https://festquest-backend.onrender.com/api";

export async function pingBackend() {
  const url = `${BASE_URL}/festivals`;

  try {
    const r = await fetch(url);
    const j = await r.json();
    return j;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}