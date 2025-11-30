import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { TestimonialCard } from "@/components/TestimonialCard";
import { ProductCardSkeleton } from "@/components/ProductCardSkeleton"; // Import skeleton
import { TestimonialCardSkeleton } from "@/components/TestimonialCardSkeleton"; // Import skeleton
import heroBg from "@/assets/hero-bg.jpg";
import { useProducts } from "@/hooks/useProducts";
import { useTestimonials } from "@/hooks/useTestimonials";

const stats = [
  { value: "500+", label: "Products Sold" },
  { value: "98%", label: "Happy Clients" },
  { value: "50+", label: "Countries" },
  { value: "24/7", label: "Support" },
];

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized for performance with modern best practices.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security for your peace of mind.",
  },
  {
    icon: Users,
    title: "Expert Support",
    description: "Dedicated team ready to help you succeed.",
  },
];

export default function Index() {
  const { data: products, isLoading: isLoadingProducts, error: productsError } = useProducts();
  const { data: testimonials, isLoading: isLoadingTestimonials, error: testimonialsError } = useTestimonials();

  const showProductSkeletons = isLoadingProducts || (productsError && !products);
  const showTestimonialSkeletons = isLoadingTestimonials || (testimonialsError && !testimonials);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroBg}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Premium Digital Products</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            >
              Get Your Dream Website
              <br />
              <span className="text-gradient">& Digital Tools Today</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-muted-foreground mb-8 max-w-2xl"
            >
              Premium templates, powerful APIs, and custom development services
              to launch your next project faster than ever.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button asChild variant="hero" size="xl">
                <Link to="/store">
                  Browse Products
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="hero-outline" size="xl">
                <Link to="/custom-order">Request Custom Project</Link>
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center md:text-left">
                  <div className="font-display text-3xl md:text-4xl font-bold text-gradient mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-start gap-4 p-6 rounded-2xl bg-card/50 border border-border"
              >
                <div className="p-3 rounded-xl bg-gradient-primary">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-display text-3xl md:text-4xl font-bold mb-4"
              >
                Featured Products
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground max-w-lg"
              >
                Discover our most popular templates, APIs, and tools trusted by developers worldwide.
              </motion.p>
            </div>
            <Button asChild variant="outline">
              <Link to="/store">
                View All Products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {productsError && products && (
            <p className="text-destructive text-center py-2">Failed to refresh products. Showing cached data. Retrying...</p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {showProductSkeletons
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products?.slice(0, 4).map((product) => <ProductCard key={product._id} {...product} />)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-primary opacity-90" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZwdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
            
            <div className="relative px-8 py-16 md:px-16 md:py-24 text-center">
              <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
                Need Something Custom?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                Let us build your perfect website or application. Our team of experts
                will bring your vision to life.
              </p>
              <Button asChild size="xl" className="bg-background text-foreground hover:bg-background/90">
                <Link to="/custom-order">
                  Start Your Project
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl md:text-4xl font-bold mb-4"
            >
              Loved by Developers
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground max-w-lg mx-auto"
            >
              See what our customers have to say about their experience.
            </motion.p>
          </div>

          {testimonialsError && testimonials && (
            <p className="text-destructive text-center py-2">Failed to refresh testimonials. Showing cached data. Retrying...</p>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {showTestimonialSkeletons
              ? Array.from({ length: 4 }).map((_, i) => <TestimonialCardSkeleton key={i} />)
              : testimonials?.map((testimonial, index) => (
                  <TestimonialCard key={testimonial._id} {...testimonial} delay={index * 0.1} />
                ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}