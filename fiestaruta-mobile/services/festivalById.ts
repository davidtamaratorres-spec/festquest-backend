import type { FestivalItem } from "./festivals";

export type FestivalDetailResponse = {
  data: FestivalItem;
};

export async function fetchFestivalById(baseUrl: string, id: string | number) {
  const url = `${baseUrl}/api/v1/festivals/${id}`;
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "Error API /festivals/:id");
  return j as FestivalDetailResponse;
}
