export async function fetchFestivalsByMunicipalityId(
  baseUrl: string,
  municipioId: string | undefined
) {
  if (!municipioId) throw new Error("municipioId faltante");

  const url = `${baseUrl}/api/v1/festivals?municipioId=${encodeURIComponent(
    String(municipioId)
  )}`;

  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${r.statusText} ${text}`);
  }

  return r.json();
}
