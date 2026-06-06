// app/services/dishes.ts

import { apiFetch } from "./api";

export type Dish = {
  id: string;
  name: string;
  price: number;
  ingredients?: string;
  restaurant_name?: string;
  city?: string;
};

type DishesResponse = {
  ok: boolean;
  data: Dish[];
};

export async function fetchDishes(): Promise<Dish[]> {
  const response = await apiFetch<DishesResponse>("/dishes");
  return response.data;
}



