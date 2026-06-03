import type { FestivalItem } from "./festivals";

// El servidor nos manda el festival directo, así que simplificamos esto:
export type FestivalDetailResponse = FestivalItem;

export async function fetchFestivalById(baseUrl: string, id: string | number) {
  // ✅ CORREGIDO: Quitamos el "/v1" para que coincida con tu index.js
  const url = `${baseUrl}/api/festivals/${id}`;
  
  console.log("Consultando detalle en:", url);

  const r = await fetch(url);
  const j = await r.json();

  if (!r.ok) {
    throw new Error(j?.error || "Error API /festivals/:id");
  }

  // Devolvemos el JSON tal cual viene del servidor
  return j as FestivalDetailResponse;
}