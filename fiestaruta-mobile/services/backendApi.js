export const BASE_URL = "https://festquest-backend.onrender.com/api";

export async function fetchMunicipalities() {
  const response = await fetch(`${BASE_URL}/municipalities`);

  if (!response.ok) {
    throw new Error("Error cargando municipios");
  }

  return response.json();
}

export async function fetchMunicipalityDetail(id) {
  const response = await fetch(`${BASE_URL}/municipalities/${id}`);

  if (!response.ok) {
    throw new Error("Error cargando detalle del municipio");
  }

  return response.json();
}