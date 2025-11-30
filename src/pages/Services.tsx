import { motion } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/ServiceCard";
import { ServiceCardSkeleton } from "@/components/ServiceCardSkeleton"; // Import skeleton
import { useServices } from "@/hooks/useServices"; // Import useServices hook

const pricingPlans = [
  {
    name: "Starter",
    description: "Perfect for small projects and MVPs",
    price: "$999",
    features: [
      "Single page application",
      "Responsive design",
      "Basic SEO optimization",
      "2 weeks delivery",
      "1 month support",
    ],
  },
  {
    name: "Professional",
    description: "For growing businesses needing more",
    price: "$2,999",
    popular: true,
    features: [
      "Multi-page application",
      "Custom UI/UX design",
      "Advanced SEO & analytics",
      "API integrations",
      "4 weeks delivery",
      "3 months support",
    ],
  },
  {
    name: "Enterprise",
    description: "Full-scale solutions for large teams",
    price: "Custom",
    features: [
      "Complex web applications",
      "Custom backend development",
      "AI/ML integration",
      "Dedicated project manager",
      "Priority support",
      "Ongoing maintenance",
    ],
  },
];

export default function Services() {
  const { data: services, isLoading, error } = useServices(); // Fetch services

  const showSkeletons = isLoading || (error && !services);

  return (
    <Layout>
      {/* Header */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary mb-6"
          >
            <span className="text-sm font-medium">Professional Services</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
          >
            Expert Development
            <br />
            <span className="text-gradient">& Design Services</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            From concept to deployment, we provide end-to-end solutions
            for your digital needs.
          </motion.p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              What We Offer
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Comprehensive services to bring your vision to life.
            </p>
          </div>

          {error && services && (
            <p className="text-destructive text-center py-2">Failed to refresh services. Showing cached data. Retrying...</p>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {showSkeletons
              ? Array.from({ length: 8 }).map((_, i) => <ServiceCardSkeleton key={i} />)
              : services?.map((service, index) => (
                  <ServiceCard key={service._id} {...service} delay={index * 0.1} />
                ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Simple Pricing
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Transparent pricing for projects of any size.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? "bg-gradient-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-background text-foreground text-sm font-medium">
                    Most Popular
                  </div>
                )}

                <h3 className="font-display text-2xl font-bold mb-2">{plan.name}</h3>
                <p className={`text-sm mb-6 ${plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span className="font-display text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "Custom" && <span className={plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"}> / project</span>}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle className={`h-5 w-5 ${plan.popular ? "text-primary-foreground" : "text-primary"}`} />
                      <span className={`text-sm ${plan.popular ? "" : "text-muted-foreground"}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.popular ? "secondary" : "outline"}
                  className="w-full"
                  size="lg"
                >
                  <Link to="/custom-order">Get Started</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Your Project?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Let's discuss your requirements and create something amazing together.
          </p>
          <Button asChild variant="hero" size="xl">
            <Link to="/custom-order">
              Request a Quote
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}