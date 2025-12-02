export interface Testimonial {
  _id: string; // MongoDB ID
  name: string;
  role: string;
  company: string;
  avatar: string;
  content: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}