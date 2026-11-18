export interface IProduct {
  name: string;
  slug: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  images?: string[];
}
