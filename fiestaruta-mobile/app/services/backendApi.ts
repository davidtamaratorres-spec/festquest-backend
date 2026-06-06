import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://festquest-backend.onrender.com';

async function getHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('partner_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function backendGet<T>(path: string): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function backendPost<T>(path: string, body: object): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function backendPut<T>(path: string, body: object): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function backendDelete<T>(path: string): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}
