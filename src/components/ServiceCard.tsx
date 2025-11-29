import { motion } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  delay?: number;
}

export function ServiceCard({ icon: Icon, title, description, features, delay = 0 }: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Card variant="glass" className="group h-full hover:border-primary/50 transition-all duration-300">
        <CardContent className="p-6 lg:p-8">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:glow-primary transition-shadow duration-300">
            <Icon className="h-7 w-7 text-primary-foreground" />
          </div>

          {/* Title */}
          <h3 className="font-display text-xl font-bold mb-3 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground mb-6">{description}</p>

          {/* Features */}
          <ul className="space-y-2 mb-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {feature}
              </li>
            ))}
          </ul>

          {/* Link */}
          <button className="flex items-center gap-2 text-primary font-semibold text-sm group/btn">
            Learn More
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
