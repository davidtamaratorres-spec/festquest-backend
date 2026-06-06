// app/services/backendDishes.ts
import { backendGet, backendPost } from "./backendApi";

export type BackendDish = {
  id: number;
  restaurante_id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  imagen_url?: string;
  disponible: number;
  tiene_descuento?: number;
  porcentaje_descuento?: number;
  acepta_domicilio?: number;
  acepta_reserva?: number;
  ciudad?: string;
  municipio?: string;
  departamento?: string;
  codigo_dane?: string;
  restaurante?: string;
  whatsapp?: string;
  maps_url?: string;
};

export type CreateBackendDishInput = {
  restaurante_id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  imagen_url?: string;
  disponible?: number;
};

export async function fetchBackendDishes(): Promise<BackendDish[]> {
  return backendGet<BackendDish[]>(`/dishes`);
}

export async function searchBackendDishes(q: string): Promise<BackendDish[]> {
  if (!q.trim()) return [];
  return backendGet<BackendDish[]>(`/dishes/search?q=${encodeURIComponent(q.trim())}`);
}

export async function fetchBackendDishById(id: number): Promise<BackendDish> {
  return backendGet<BackendDish>(`/dishes/${id}`);
}

export async function createBackendDish(
  input: CreateBackendDishInput
): Promise<{ ok: boolean; id: number | null }> {
  return backendPost<{ ok: boolean; id: number | null }>(`/dishes`, {
    restaurante_id: input.restaurante_id,
    nombre: input.nombre,
    descripcion: input.descripcion ?? "",
    precio: input.precio,
    categoria: input.categoria ?? "Test",
    imagen_url: input.imagen_url ?? "",
    disponible: input.disponible ?? 1,
  });
}
