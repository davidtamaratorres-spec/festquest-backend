// app/services/backendPromotions.ts
import { backendGet } from "./backendApi";

export type BackendPromotion = {
  id: number;
  restaurante_id: number;

  // campos opcionales (depende de tu backend)
  tipo?: string; // percentage | two_for_one | free_item | etc
  valor?: number;
  descripcion?: string;
  activa?: number; // 1/0
  disponible?: number; // 1/0 (por si tu backend usa este nombre)
};

export async function fetchBackendPromotions(): Promise<BackendPromotion[]> {
  return backendGet<BackendPromotion[]>(`/promotions`);
}
