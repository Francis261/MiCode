import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const projectTypes = [
  "Portfolio Website",
  "E-Commerce Store",
  "SaaS Application",
  "Blog / Content Site",
  "Landing Page",
  "Web Application",
  "Mobile App",
  "API Development",
  "Other",
];

const budgetRanges = [
  "$500 - $1,000",
  "$1,000 - $2,500",
  "$2,500 - $5,000",
  "$5,000 - $10,000",
  "$10,000+",
];

const timelines = [
  "1-2 weeks",
  "2-4 weeks",
  "1-2 months",
  "2-3 months",
  "Flexible",
];

export default function CustomOrder() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    projectType: "",
    budget: "",
    timeline: "",
    description: "",
    features: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const newOrderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    setOrderId(newOrderId);
    setIsSubmitted(true);
    setIsSubmitting(false);

    toast({
      title: "Order Submitted!",
      description: `Your order ID is ${newOrderId}. We'll be in touch soon.`,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (isSubmitted) {
    return (
      <Layout>
        <section className="py-20 min-h-[70vh] flex items-center">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-8"
            >
              <CheckCircle className="h-10 w-10 text-primary" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-4xl font-bold mb-4"
            >
              Order Submitted!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-lg mb-8"
            >
              Thank you for your request. We'll review your project details and
              get back to you within 24-48 hours.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-xl p-6 mb-8"
            >
              <p className="text-sm text-muted-foreground mb-2">Your Order ID</p>
              <p className="font-display text-2xl font-bold text-primary">{orderId}</p>
            </motion.div>

            <Button onClick={() => setIsSubmitted(false)} variant="outline">
              Submit Another Request
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <section className="py-12 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-5xl font-bold mb-4"
          >
            Custom Project Request
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-2xl"
          >
            Tell us about your project and we'll create a tailored solution just for you.
          </motion.p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Card variant="glass">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Contact Information */}
                <div>
                  <h2 className="font-display text-xl font-bold mb-4">Contact Information</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="John Doe"
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="john@example.com"
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="company">Company / Organization</Label>
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Your Company Name"
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div>
                  <h2 className="font-display text-xl font-bold mb-4">Project Details</h2>
                  <div className="grid sm:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectType">Project Type *</Label>
                      <select
                        id="projectType"
                        name="projectType"
                        value={formData.projectType}
                        onChange={handleChange}
                        required
                        className="w-full h-11 px-4 rounded-lg bg-background border border-input text-foreground"
                      >
                        <option value="">Select type...</option>
                        {projectTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget Range *</Label>
                      <select
                        id="budget"
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        required
                        className="w-full h-11 px-4 rounded-lg bg-background border border-input text-foreground"
                      >
                        <option value="">Select budget...</option>
                        {budgetRanges.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeline">Timeline *</Label>
                      <select
                        id="timeline"
                        name="timeline"
                        value={formData.timeline}
                        onChange={handleChange}
                        required
                        className="w-full h-11 px-4 rounded-lg bg-background border border-input text-foreground"
                      >
                        <option value="">Select timeline...</option>
                        {timelines.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <Label htmlFor="description">Project Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      placeholder="Describe your project, goals, and target audience..."
                      rows={4}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="features">Key Features & Requirements</Label>
                    <Textarea
                      id="features"
                      name="features"
                      value={formData.features}
                      onChange={handleChange}
                      placeholder="List the main features you need (e.g., user authentication, payment processing, admin dashboard...)"
                      rows={4}
                      className="bg-background"
                    />
                  </div>
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Submit Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
