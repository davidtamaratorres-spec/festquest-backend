import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../services/backendApi';

export const authService = {
  async register(
    email: string,
    password: string,
    nombre_restaurante: string,
    ciudad: string,
    whatsapp: string
  ): Promise<void> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nombre_restaurante, ciudad, whatsapp }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al registrarse');
    }

    await AsyncStorage.setItem('partner_token', data.token);
    await AsyncStorage.setItem('partner_restaurante_id', String(data.restaurante_id));
  },

  async login(email: string, password: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Credenciales inválidas');
    }

    await AsyncStorage.setItem('partner_token', data.token);
    await AsyncStorage.setItem('partner_restaurante_id', String(data.restaurante_id));

    return true;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('partner_token');
    await AsyncStorage.removeItem('partner_restaurante_id');
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem('partner_token');
  },

  async isLoggedIn(): Promise<boolean> {
    const token = await AsyncStorage.getItem('partner_token');
    return !!token;
  },
};
