import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TestimonialCardProps {
  name: string;
  role: string;
  company: string;
  avatar: string;
  content: string;
  rating: number;
  delay?: number;
}

export function TestimonialCard({
  name,
  role,
  company,
  avatar,
  content,
  rating,
  delay = 0,
}: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Card variant="glass" className="h-full">
        <CardContent className="p-6 lg:p-8">
          {/* Quote Icon */}
          <Quote className="h-10 w-10 text-primary/30 mb-4" />

          {/* Content */}
          <p className="text-foreground mb-6 leading-relaxed">{content}</p>

          {/* Rating */}
          <div className="flex gap-1 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < rating ? "fill-primary text-primary" : "text-muted"
                }`}
              />
            ))}
          </div>

          {/* Author */}
          <div className="flex items-center gap-4">
            <img
              src={avatar}
              alt={name}
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/30"
            />
            <div>
              <h4 className="font-semibold">{name}</h4>
              <p className="text-sm text-muted-foreground">
                {role} at {company}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
