import { motion } from "framer-motion";
import { ShoppingCart, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { Product } from "@/types/product"; // Import Product interface from types

// ProductCardProps now extends the Product interface
interface ProductCardProps extends Product {}

export function ProductCard({
  _id,
  id,
  title,
  description,
  price,
  originalPrice,
  image,
  category,
  tags,
  rating,
  reviews,
  languageFramework,
  templateType,
}: ProductCardProps) {
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;
  const { addItemToCart } = useCart();

  const handleAddToCart = () => {
    addItemToCart({ _id, id, title, description, price, originalPrice, image, category, tags, rating, reviews, languageFramework, templateType });
    toast.success(`${title} added to cart!`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Card variant="elevated" className="group overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Hover Actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button variant="glass" size="icon">
              <Eye className="h-5 w-5" />
            </Button>
            <Button variant="hero" size="icon" onClick={handleAddToCart}>
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant="secondary" className="bg-primary/90 text-primary-foreground border-0">
              {category}
            </Badge>
            {discount > 0 && (
              <Badge variant="destructive" className="border-0">
                -{discount}%
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-5">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Title & Description */}
          <h3 className="font-display font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {description}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">({reviews} reviews)</span>
          </div>

          {/* Price & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-primary">
                ${price}
              </span>
              {originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  ${originalPrice}
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleAddToCart}>
              Add to Cart
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}