const BASE = 'https://festquest-backend.onrender.com';

export type FestivalListItem = {
  id: number;
  nombre: string;
  fecha: string | null;
  date_start: string | null;
  date_end: string | null;
  descripcion: string | null;
  lugar_encuentro: string | null;
  municipio_id: number | null;
  municipio: string | null;
  departamento: string | null;
  subregion: string | null;
};

export type Festival = {
  id: number;
  nombre: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  descripcion: string | null;
  lugar_encuentro: string | null;
  maps_link: string | null;
  whatsapp_link: string | null;
  municipio_id: number | null;
  municipio: string | null;
  departamento: string | null;
  subregion: string | null;
  habitantes: number | null;
  temperatura_promedio: number | null;
  altura: number | null;
  sitio_1: string | null; maps_1: string | null;
  sitio_2: string | null; maps_2: string | null;
  sitio_3: string | null; maps_3: string | null;
  hotel_1: string | null; wa_1: string | null;
  hotel_2: string | null; wa_2: string | null;
  hotel_3: string | null; wa_3: string | null;
};

export type FestivalMini = {
  id: number;
  nombre: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

export type Municipio = {
  id: number;
  nombre: string;
  departamento: string | null;
  subregion: string | null;
  codigo_dane: string | null;
  gentilicio: string | null;
  habitantes: number | null;
  temperatura_promedio: number | null;
  altura: number | null;
  alcalde: string | null;
  correo_alcalde: string | null;
  bandera_url: string | null;
  sitio_1: string | null; maps_1: string | null;
  sitio_2: string | null; maps_2: string | null;
  sitio_3: string | null; maps_3: string | null;
  hotel_1: string | null; wa_1: string | null;
  hotel_2: string | null; wa_2: string | null;
  hotel_3: string | null; wa_3: string | null;
};

export type MunicipioResponse = {
  municipio: Municipio;
  places: { nombre: string; maps_link: string }[];
  hotels: { nombre: string; whatsapp_link: string }[];
  festivals: FestivalMini[];
};

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const getFestivals = () =>
  apiFetch<FestivalListItem[]>('/api/festivals');

export const getFestival = (id: string | number) =>
  apiFetch<Festival>(`/api/festivals/${id}`);

export const getMunicipio = (id: string | number) =>
  apiFetch<MunicipioResponse>(`/api/municipalities/${id}`);
