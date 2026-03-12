export type FestivalItem = {
  id: number;
  nombre: string;
  municipio_nombre: string;
  departamento: string;
  fecha_inicio: string;
  fecha_fin: string | null;
};

// Función para traer la LISTA
export async function fetchFestivals(baseUrl: string, params: Record<string, string>) {
  const queryParams = new URLSearchParams(params).toString();
  // Corregido: añadimos /api/
  const url = `${baseUrl}/api/festivals?${queryParams}`;

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

    const json = await response.json();
    return json; 
  } catch (error) {
    console.error("Error en fetchFestivals:", error);
    throw error;
  }
}

// Función para traer el DETALLE (ID único)
export async function fetchFestivalById(baseUrl: string, id: string | number) {
  // Corregido: añadimos /api/
  const url = `${baseUrl}/api/festivals/${id}`;

  console.log("Pidiendo detalle a:", url);

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

    const json = await response.json();
    return json;
  } catch (error) {
    console.error("Error en fetchFestivalById:", error);
    throw error;
  }
}