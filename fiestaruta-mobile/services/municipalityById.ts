export async function fetchMunicipalityById(
  baseUrl: string,
  id: string | number
) {
  const url = `${baseUrl}/api/v1/municipalities/${id}`;

  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Error fetching municipality");
  }

  return res.json();
}
