export type FestivalItem = {
  id: number;
  nombre: string;
  municipio_nombre: string;
  departamento: string;
  fecha_inicio: string;
  fecha_fin: string | null;
};

type BackendFestival = {
  id: number;
  nombre: string;
  municipio?: string;
  departamento?: string;
  fecha?: string;
  descripcion?: string | null;
  municipio_id?: number;
  habitantes?: string | null;
  altura?: string | null;
  lugar_encuentro?: string | null;
  maps_link?: string | null;
  whatsapp_link?: string | null;
};

function mapFestival(item: BackendFestival): FestivalItem {
  return {
    id: item.id,
    nombre: item.nombre ?? "",
    municipio_nombre: item.municipio ?? "",
    departamento: item.departamento ?? "",
    fecha_inicio: item.fecha ?? "",
    fecha_fin: null,
  };
}

// Función para traer la LISTA
export async function fetchFestivals(
  baseUrl: string,
  params: Record<string, string> = {}
): Promise<FestivalItem[]> {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value != null && value !== "")
  );

  const queryParams = new URLSearchParams(cleanParams).toString();
  const url = queryParams
    ? `${baseUrl}/api/festivals?${queryParams}`
    : `${baseUrl}/api/festivals`;

  console.log("Pidiendo lista a:", url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error en servidor: ${response.status}`);
    }

    const json: BackendFestival[] = await response.json();

    if (!Array.isArray(json)) {
      throw new Error("La respuesta de /api/festivals no es una lista válida");
    }

    return json.map(mapFestival);
  } catch (error) {
    console.error("Error en fetchFestivals:", error);
    throw error;
  }
}

// Función para traer el DETALLE (por ahora reutiliza la lista y busca por ID)
export async function fetchFestivalById(
  baseUrl: string,
  id: string | number
): Promise<FestivalItem | null> {
  const url = `${baseUrl}/api/festivals`;

  console.log("Pidiendo detalle desde lista a:", url, "ID:", id);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error en detalle: ${response.status}`);
    }

    const json: BackendFestival[] = await response.json();

    if (!Array.isArray(json)) {
      throw new Error("La respuesta de /api/festivals no es una lista válida");
    }

    const found = json.find((item) => String(item.id) === String(id));

    return found ? mapFestival(found) : null;
  } catch (error) {
    console.error("Error en fetchFestivalById:", error);
    throw error;
  }
}