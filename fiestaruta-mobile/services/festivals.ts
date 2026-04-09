const BASE_URL = "https://festquest-backend.onrender.com/api";

export type FestivalItem = {
  id: number;
  nombre?: string | null;
  festival?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  date_start?: string | null;
  date_end?: string | null;
};

type FestivalFilters = {
  municipio?: string;
  departamento?: string;
  fecha?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
};

export async function fetchFestivals(filters: FestivalFilters = {}) {
  const params = new URLSearchParams();

  if (filters.municipio) params.append("municipio", filters.municipio);
  if (filters.departamento) params.append("departamento", filters.departamento);
  if (filters.fecha) params.append("fecha", filters.fecha);
  if (filters.fecha_inicio) params.append("fecha_inicio", filters.fecha_inicio);
  if (filters.fecha_fin) params.append("fecha_fin", filters.fecha_fin);

  const qs = params.toString();
  const url = `${BASE_URL}/festivals${qs ? `?${qs}` : ""}`;

  console.log("URL FESTIVALS:", url);

  const r = await fetch(url);
  const j = await r.json();

  return Array.isArray(j) ? j : [];
}