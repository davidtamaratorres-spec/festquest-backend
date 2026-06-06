import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'https://dishquest-backend.onrender.com';

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: object } = {}
): Promise<T> {
  const token = await AsyncStorage.getItem('partner_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}
