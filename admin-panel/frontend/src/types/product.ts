export interface Product {
  _id: string; // MongoDB ID
  id: string; // Original static ID, if still needed for some logic
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  tags: string[];
  rating: number;
  reviews: number;
  languageFramework?: string;
  templateType?: string;
  isHidden: boolean; // New field
  previewUrl?: string; // New field for product preview link
}