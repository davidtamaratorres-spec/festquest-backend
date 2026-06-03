const BASE_URL = "https://festquest-backend.onrender.com/api";

type FestivalFilters = {
  municipio?: string;
  departamento?: string;
  fecha?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
};

export async function getFestivals(filters: FestivalFilters = {}) {
  try {
    const params = new URLSearchParams();

    if (filters.municipio) params.append("municipio", filters.municipio);
    if (filters.departamento) params.append("departamento", filters.departamento);
    if (filters.fecha) params.append("fecha", filters.fecha);

    // 🔴 rango
    if (filters.fecha_inicio) params.append("fecha_inicio", filters.fecha_inicio);
    if (filters.fecha_fin) params.append("fecha_fin", filters.fecha_fin);

    const url = `${BASE_URL}/festivals?${params.toString()}`;

    console.log("URL:", url);

    const r = await fetch(url);
    const j = await r.json();

    return j;
  } catch (error: any) {
    console.error("Error:", error);
    throw error;
  }
}