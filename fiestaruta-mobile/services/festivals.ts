const BASE_URL = "https://festquest-backend.onrender.com/api";

export type FestivalItem = {
  id: number;
  nombre?: string | null;
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

  source_type?: string | null;
  verified?: boolean | null;
  is_active?: boolean | null;
};

type ApiResponse = {
  success?: boolean;
  data?: any[];
};

export async function fetchFestivals(): Promise<FestivalItem[]> {
  const response = await fetch(`${BASE_URL}/festivals`);

  if (!response.ok) {
    throw new Error("Error cargando festivales");
  }

  const json: ApiResponse | any[] = await response.json();

  const rawItems = Array.isArray(json) ? json : (json.data || []);

  return rawItems.map((item: any) => ({
    id: item.id,
    nombre: item.nombre ?? null,
    descripcion: item.descripcion ?? null,

    // compatibilidad backend actual
    fecha: item.fecha ?? null,
    fecha_inicio: item.fecha_inicio ?? item.fecha ?? null,
    fecha_fin: item.fecha_fin ?? item.fecha ?? null,

    municipio_id: item.municipio_id ?? null,
    municipio: item.municipio ?? null,
    departamento: item.departamento ?? null,
    subregion: item.subregion ?? null,
    habitantes: item.habitantes ?? null,
    altura: item.altura ?? null,

    source_type: item.source_type ?? null,
    verified: item.verified ?? null,
    is_active: item.is_active ?? null,
  }));
}