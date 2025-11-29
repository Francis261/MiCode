export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  tags: string[];
  rating: number;
  reviews: number;
}

export const products: Product[] = [
  {
    id: "1",
    title: "SaaS Dashboard Pro",
    description: "A complete React dashboard template with charts, tables, and authentication ready to use.",
    price: 79,
    originalPrice: 129,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop",
    category: "Template",
    tags: ["React", "TypeScript", "Tailwind"],
    rating: 4.9,
    reviews: 234,
  },
  {
    id: "2",
    title: "E-Commerce Starter Kit",
    description: "Full-featured e-commerce template with product pages, cart, and checkout flow.",
    price: 99,
    originalPrice: 149,
    image: "https://images.unsplash.com/photo-1557821552-17105176677c?w=800&auto=format&fit=crop",
    category: "Template",
    tags: ["Next.js", "Stripe", "Prisma"],
    rating: 4.8,
    reviews: 189,
  },
  {
    id: "3",
    title: "AI Content API",
    description: "Powerful API for generating blog posts, social media content, and marketing copy.",
    price: 29,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop",
    category: "API",
    tags: ["REST API", "GPT-4", "Node.js"],
    rating: 4.7,
    reviews: 156,
  },
  {
    id: "4",
    title: "Portfolio Builder",
    description: "Beautiful portfolio template for designers and developers with CMS integration.",
    price: 49,
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop",
    category: "Template",
    tags: ["React", "Sanity", "Framer Motion"],
    rating: 4.9,
    reviews: 312,
  },
  {
    id: "5",
    title: "Discord Bot Framework",
    description: "Modular Discord bot with commands, moderation, and custom plugin support.",
    price: 39,
    image: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=800&auto=format&fit=crop",
    category: "Tool",
    tags: ["Discord.js", "TypeScript", "MongoDB"],
    rating: 4.6,
    reviews: 98,
  },
  {
    id: "6",
    title: "Payment Gateway Integration",
    description: "Ready-to-use payment integration with Stripe, PayPal, and cryptocurrency support.",
    price: 69,
    originalPrice: 99,
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&auto=format&fit=crop",
    category: "API",
    tags: ["Stripe", "PayPal", "Web3"],
    rating: 4.8,
    reviews: 145,
  },
  {
    id: "7",
    title: "Landing Page Kit",
    description: "Collection of 50+ landing page sections with animations and responsive design.",
    price: 59,
    image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&auto=format&fit=crop",
    category: "Component",
    tags: ["React", "Tailwind", "Animations"],
    rating: 4.7,
    reviews: 267,
  },
  {
    id: "8",
    title: "Authentication System",
    description: "Complete auth solution with OAuth, MFA, and role-based access control.",
    price: 89,
    originalPrice: 129,
    image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&auto=format&fit=crop",
    category: "Tool",
    tags: ["OAuth", "JWT", "RBAC"],
    rating: 4.9,
    reviews: 198,
  },
];

export const categories = [
  { value: "all", label: "All Products" },
  { value: "Template", label: "Templates" },
  { value: "API", label: "APIs" },
  { value: "Tool", label: "Tools" },
  { value: "Component", label: "Components" },
];
