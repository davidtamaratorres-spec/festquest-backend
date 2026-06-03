export async function fetchFestivalsByMunicipalityId(baseUrl: string, query?: string) {
  // Cambiamos 'id=' por 'municipio_id=' para que el backend lo reconozca
  const url = query 
    ? `${baseUrl}/festivals?municipio_id=${encodeURIComponent(query)}`
    : `${baseUrl}/festivals`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Error en servidor");
  
  const result = await response.json();
  // Retornamos directamente el array de datos
  return result.data || []; 
}