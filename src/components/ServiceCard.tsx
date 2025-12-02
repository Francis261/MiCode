import { motion } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface ServiceCardProps {
  _id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  actionButton?: {
    label: string;
    url: string;
  };
  statusTag?: string;
  content?: string;
  delay?: number;
}

export function ServiceCard({ 
  _id,
  icon: Icon, 
  title, 
  description, 
  features, 
  actionButton,
  statusTag,
  content,
  delay = 0 
}: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Card variant="glass" className="group h-full hover:border-primary/50 transition-all duration-300 flex flex-col">
        <CardContent className="p-6 lg:p-8 flex flex-col flex-1">
          {/* Icon and Status Tag */}
          <div className="flex items-start justify-between mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:glow-primary transition-shadow duration-300">
              <Icon className="h-7 w-7 text-primary-foreground" />
            </div>
            {statusTag && (
              <Badge variant="secondary" className="text-xs">
                {statusTag}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="font-display text-xl font-bold mb-3 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground mb-6">{description}</p>

          {/* Features */}
          <ul className="space-y-2 mb-6 flex-1">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {feature}
              </li>
            ))}
          </ul>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-auto">
            {content && (
              <Link to={`/services/${_id}`} className="flex-1">
                <Button variant="ghost" className="w-full text-sm" size="sm">
                  Learn More
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
            {actionButton && (
              <a 
                href={actionButton.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full text-sm" size="sm">
                  {actionButton.label}
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
