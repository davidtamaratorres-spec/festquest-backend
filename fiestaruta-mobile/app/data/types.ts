export type DiscountType = "percentage" | "two_for_one" | "free_item";

export type Dish = {
  id: string;
  name: string;
  price: number;
  description: string;
  image: any;
};

export type Restaurant = {
  id: string;
  name: string;
  city: string;
  distanceKm: number;

  hasParking: boolean;

  offersDiscount: boolean;
  discountType?: DiscountType;
  discountValue?: number;
  promoDescription?: string;

  whatsappPhone: string;

  dishes: Dish[];
};
