export type ListingViewModel = {
  id: string;
  brand: string;
  title: string;
  price: string;
  currency: "JPY";
  surface: string;
  object: ProductVisualKind;
  imageUrl?: string;
};

export type ProductVisualKind = "camera" | "keyboard" | "monitor" | "watch" | "speaker" | "lamp";
