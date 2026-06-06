export type PublicDish = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  imageUri?: string;
  restaurantName: string;
  city: string;
};

// Local dishes removed — all dishes come from the backend via fetchBackendDishes()
export async function getPublicDishes(): Promise<PublicDish[]> {
  return [];
}
