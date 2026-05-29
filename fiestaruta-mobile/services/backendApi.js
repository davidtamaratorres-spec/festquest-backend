export const BASE_URL = "https://festquest-backend.onrender.com/api";

async function request(path, errorMessage) {
  const response = await fetch(`${BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`${errorMessage}. Código: ${response.status}`);
  }

  return response.json();
}

// ===============================
// FESTQUEST - Municipios
// Se dejan para no romper pantallas antiguas
// ===============================

export async function fetchMunicipalities() {
  return request("/municipalities", "Error cargando municipios");
}

export async function fetchMunicipalityDetail(id) {
  return request(`/municipalities/${id}`, "Error cargando detalle del municipio");
}

// ===============================
// DISHQUEST - Restaurantes
// ===============================

export async function fetchRestaurants() {
  return request("/restaurants", "Error cargando restaurantes");
}

export async function fetchRestaurantDetail(id) {
  return request(`/restaurants/${id}`, "Error cargando detalle del restaurante");
}

// ===============================
// DISHQUEST - Platos
// ===============================

export async function fetchDishes() {
  return request("/dishes", "Error cargando platos");
}

export async function fetchDishDetail(id) {
  return request(`/dishes/${id}`, "Error cargando detalle del plato");
}

// ===============================
// DISHQUEST - Promociones
// ===============================

export async function fetchPromotions() {
  return request("/promotions", "Error cargando promociones");
}