export type FestivalItem = {
  id: number;
  nombre: string;
  municipio_nombre: string;
  departamento: string;
  fecha_inicio: string;
  fecha_fin: string | null;
};

export async function fetchFestivals(baseUrl: string, params: Record<string, string>) {
  // 1. Construimos la URL con los parámetros (page, departamento, etc.)
  const queryParams = new URLSearchParams(params).toString();
  const url = `${baseUrl}/festivals?${queryParams}`;

  console.log("Pidiendo datos a:", url); // Esto te saldrá en la terminal de la PC

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