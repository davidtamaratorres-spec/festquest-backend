// app/services/backendRestaurants.ts
import { backendGet } from "./backendApi";

export type BackendRestaurant = {
  id: number;
  nombre: string;
  ciudad?: string;
  whatsapp?: string;
  direccion?: string;
};

export async function fetchBackendRestaurants(): Promise<BackendRestaurant[]> {
  return backendGet<BackendRestaurant[]>(`/restaurants`);
}
