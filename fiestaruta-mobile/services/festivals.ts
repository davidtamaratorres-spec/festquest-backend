const BASE_URL = "https://festquest-backend.onrender.com/api";

export type FestivalItem = {
  id: number;
  nombre?: string | null;
  festival?: string | null;
  descripcion?: string | null;
  fecha?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  municipio_id?: number | null;
  municipio?: string | null;
  departamento?: string | null;
  subregion?: string | null;
  habitantes?: number | null;
  altura?: number | null;
  temperatura_promedio?: string | null;
  source_type?: string | null;
  verified?: boolean | null;
  is_active?: boolean | null;
  sitios_turisticos?: string | null;
  hoteles?: string | null;
  contacto_hoteles?: string | null;
};

type ApiResponse = {
  success?: boolean;
  data?: any[];
};

export type FetchFestivalsParams = {
  fecha?: string;
  departamento?: string;
  municipio?: string;
};

function buildFestivalsUrl(params?: FetchFestivalsParams) {
  const url = new URL(`${BASE_URL}/festivals`);

  if (!params) return url.toString();

  if (params.fecha) {
    url.searchParams.set("fecha", params.fecha);
  }

  if (params.departamento) {
    url.searchParams.set("departamento", params.departamento);
  }

  if (params.municipio) {
    url.searchParams.set("municipio", params.municipio);
  }

  return url.toString();
}

export async function fetchFestivals(
  params?: FetchFestivalsParams
): Promise<FestivalItem[]> {
  const response = await fetch(buildFestivalsUrl(params));

  if (!response.ok) {
    throw new Error("Error cargando festivales");
  }

  const json: ApiResponse | any[] = await response.json();
  const rawItems = Array.isArray(json) ? json : json.data || [];

  return rawItems.map((item: any) => ({
    id: item.id,
    nombre: item.nombre ?? null,
    festival: item.festival ?? item.nombre ?? null,
    descripcion: item.descripcion ?? null,
    fecha: item.fecha ?? null,
    fecha_inicio: item.fecha_inicio ?? item.fecha ?? null,
    fecha_fin: item.fecha_fin ?? item.fecha ?? null,
    municipio_id: item.municipio_id ?? null,
    municipio: item.municipio ?? null,
    departamento: item.departamento ?? null,
    subregion: item.subregion ?? null,
    habitantes: item.habitantes ?? null,
    altura: item.altura ?? null,
    temperatura_promedio: item.temperatura_promedio ?? null,
    source_type: item.source_type ?? null,
    verified: item.verified ?? null,
    is_active: item.is_active ?? null,
    sitios_turisticos: item.sitios_turisticos ?? null,
    hoteles: item.hoteles ?? null,
    contacto_hoteles: item.contacto_hoteles ?? null,
  }));
}

export async function fetchFestivalById(id: string | number) {
  const response = await fetch(`${BASE_URL}/festivals/${id}`);

  if (!response.ok) {
    throw new Error("Error cargando detalle del festival");
  }

  return response.json();
}