 export interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  description?: string;
  available: boolean;
  imageUri?: string; // 👈 AHORA SÍ EXISTE
}

