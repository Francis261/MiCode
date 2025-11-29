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
  languageFramework?: string; // e.g., "React", "Next.js", "Vue", "Node.js"
  templateType?: string; // e.g., "Login/Signup", "Landing Page", "Dashboard", "E-commerce"
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
    languageFramework: "React",
    templateType: "Dashboard",
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
    languageFramework: "Next.js",
    templateType: "E-commerce",
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
    languageFramework: "Node.js",
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
    languageFramework: "React",
    templateType: "Portfolio",
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
    languageFramework: "TypeScript",
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
    languageFramework: "Node.js", // Assuming backend integration
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
    languageFramework: "React",
    templateType: "Landing Page", // Can be a component used in a landing page
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
    languageFramework: "Node.js", // Backend tool
    templateType: "Login/Signup", // Can be a component used in a login/signup flow
  },
  {
    id: "9",
    title: "Blog Template Pro",
    description: "A modern blog template with markdown support and dynamic routing.",
    price: 65,
    image: "https://images.unsplash.com/photo-1488190211105-8b0e65405f64?w=800&auto=format&fit=crop",
    category: "Template",
    tags: ["Next.js", "Markdown", "CMS"],
    rating: 4.7,
    reviews: 110,
    languageFramework: "Next.js",
    templateType: "Blog",
  },
  {
    id: "10",
    title: "Admin Panel UI Kit",
    description: "A comprehensive set of UI components for building admin dashboards.",
    price: 75,
    image: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&auto=format&fit=crop",
    category: "Component",
    tags: ["React", "Tailwind", "UI Kit"],
    rating: 4.8,
    reviews: 130,
    languageFramework: "React",
    templateType: "Dashboard",
  },
];

export const categories = [
  { value: "all", label: "All Products" },
  { value: "Template", label: "Templates" },
  { value: "API", label: "APIs" },
  { value: "Tool", label: "Tools" },
  { value: "Component", label: "Components" },
];

export const languageFrameworks = [
  { value: "all", label: "All Frameworks" },
  { value: "React", label: "React" },
  { value: "Next.js", label: "Next.js" },
  { value: "Vue", label: "Vue" },
  { value: "Node.js", label: "Node.js" },
  { value: "TypeScript", label: "TypeScript" },
];

export const templateTypes = [
  { value: "all", label: "All Template Types" },
  { value: "Login/Signup", label: "Login/Signup" },
  { value: "Landing Page", label: "Landing Page" },
  { value: "Dashboard", label: "Dashboard" },
  { value: "E-commerce", label: "E-commerce" },
  { value: "Portfolio", label: "Portfolio" },
  { value: "Blog", label: "Blog" },
  { value: "Splash Screen", label: "Splash Screen" },
];