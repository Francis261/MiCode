import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface BudgetRange {
  label: string;
  minAmount: number;
  maxAmount: number;
  isCustom?: boolean;
}

interface TimelineOption {
  label: string;
  minDays: number;
  maxDays: number;
  isCustom?: boolean;
}

interface ProjectType {
  _id: string;
  name: string;
  description?: string;
  budgetRanges: BudgetRange[];
  timelines: TimelineOption[];
  features?: string[];
  isActive: boolean;
}

export default function CustomOrder() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | null>(null);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientCompany: "",
    clientPhone: "",
    projectType: "",
    customProjectType: "",
    budget: "",
    customBudgetMin: "",
    customBudgetMax: "",
    timeline: "",
    customTimelineValue: "",
    customTimelineUnit: "weeks",
    description: "",
    features: "",
  });

  // Fetch project types from backend
  useEffect(() => {
    const fetchProjectTypes = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/custom-order/project-types`);
        if (response.ok) {
          const data = await response.json();
          setProjectTypes(data);
        }
      } catch (error) {
        console.error('Failed to fetch project types:', error);
      } finally {
        setIsLoadingTypes(false);
      }
    };
    fetchProjectTypes();
  }, []);

  // Update selected project type when selection changes
  useEffect(() => {
    if (formData.projectType && formData.projectType !== "other") {
      const found = projectTypes.find(pt => pt.name === formData.projectType);
      setSelectedProjectType(found || null);
    } else {
      setSelectedProjectType(null);
    }
    // Reset budget and timeline when project type changes
    setFormData(prev => ({ ...prev, budget: "", timeline: "" }));
  }, [formData.projectType, projectTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData: Record<string, unknown> = {
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientCompany: formData.clientCompany || undefined,
        clientPhone: formData.clientPhone || undefined,
        projectType: formData.projectType === "other" ? "Other" : formData.projectType,
        customProjectType: formData.projectType === "other" ? formData.customProjectType : undefined,
        budget: formData.budget === "custom" ? "Custom" : formData.budget,
        customBudget: formData.budget === "custom" ? {
          min: parseFloat(formData.customBudgetMin) || 0,
          max: parseFloat(formData.customBudgetMax) || 0,
          currency: "USD"
        } : undefined,
        timeline: formData.timeline === "custom" ? "Custom" : formData.timeline,
        customTimeline: formData.timeline === "custom" ? {
          value: parseInt(formData.customTimelineValue) || 0,
          unit: formData.customTimelineUnit
        } : undefined,
        description: formData.description,
        features: formData.features || undefined,
      };

      const response = await fetch(`${API_BASE}/api/custom-order/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        setOrderId(data.orderId);
        setIsSubmitted(true);
        toast({
          title: "Order Submitted!",
          description: `Your order ID is ${data.orderId}. We'll be in touch soon.`,
        });
      } else {
        throw new Error(data.message || 'Failed to submit order');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Get budget ranges based on selected project type or use defaults
  const getBudgetOptions = () => {
    if (selectedProjectType?.budgetRanges?.length) {
      return selectedProjectType.budgetRanges;
    }
    return [
      { label: "$500 - $1,000", minAmount: 500, maxAmount: 1000 },
      { label: "$1,000 - $2,500", minAmount: 1000, maxAmount: 2500 },
      { label: "$2,500 - $5,000", minAmount: 2500, maxAmount: 5000 },
      { label: "$5,000 - $10,000", minAmount: 5000, maxAmount: 10000 },
      { label: "$10,000+", minAmount: 10000, maxAmount: 100000 },
    ];
  };

  // Get timeline options based on selected project type or use defaults
  const getTimelineOptions = () => {
    if (selectedProjectType?.timelines?.length) {
      return selectedProjectType.timelines;
    }
    return [
      { label: "1-2 weeks", minDays: 7, maxDays: 14 },
      { label: "2-4 weeks", minDays: 14, maxDays: 28 },
      { label: "1-2 months", minDays: 30, maxDays: 60 },
      { label: "2-3 months", minDays: 60, maxDays: 90 },
      { label: "Flexible", minDays: 0, maxDays: 365 },
    ];
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
                      <Label htmlFor="clientName">Full Name *</Label>
                      <Input
                        id="clientName"
                        name="clientName"
                        value={formData.clientName}
                        onChange={handleChange}
                        required
                        placeholder="John Doe"
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientEmail">Email Address *</Label>
                      <Input
                        id="clientEmail"
                        name="clientEmail"
                        type="email"
                        value={formData.clientEmail}
                        onChange={handleChange}
                        required
                        placeholder="john@example.com"
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientCompany">Company / Organization</Label>
                      <Input
                        id="clientCompany"
                        name="clientCompany"
                        value={formData.clientCompany}
                        onChange={handleChange}
                        placeholder="Your Company Name"
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone">Phone Number</Label>
                      <Input
                        id="clientPhone"
                        name="clientPhone"
                        type="tel"
                        value={formData.clientPhone}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div>
                  <h2 className="font-display text-xl font-bold mb-4">Project Details</h2>
                  
                  {/* Project Type */}
                  <div className="space-y-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectType">Project Type *</Label>
                      <select
                        id="projectType"
                        name="projectType"
                        value={formData.projectType}
                        onChange={handleChange}
                        required
                        className="w-full h-11 px-4 rounded-lg bg-background border border-input text-foreground"
                        disabled={isLoadingTypes}
                      >
                        <option value="">Select type...</option>
                        {projectTypes.map((type) => (
                          <option key={type._id} value={type.name}>
                            {type.name}
                          </option>
                        ))}
                        <option value="other">Other (Custom)</option>
                      </select>
                    </div>
                    
                    {formData.projectType === "other" && (
                      <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                        <Label htmlFor="customProjectType">Describe Your Project Type *</Label>
                        <Input
                          id="customProjectType"
                          name="customProjectType"
                          value={formData.customProjectType}
                          onChange={handleChange}
                          required
                          placeholder="e.g., AI-powered chatbot, Blockchain application..."
                          className="bg-background"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    {/* Budget */}
                    <div className="space-y-4">
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
                          {getBudgetOptions().map((range, idx) => (
                            <option key={idx} value={range.label}>
                              {range.label}
                            </option>
                          ))}
                          <option value="custom">Custom Budget</option>
                        </select>
                      </div>
                      
                      {formData.budget === "custom" && (
                        <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                          <Label>Custom Budget Range (USD) *</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              name="customBudgetMin"
                              type="number"
                              value={formData.customBudgetMin}
                              onChange={handleChange}
                              required
                              placeholder="Min"
                              className="bg-background"
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input
                              name="customBudgetMax"
                              type="number"
                              value={formData.customBudgetMax}
                              onChange={handleChange}
                              required
                              placeholder="Max"
                              className="bg-background"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
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
                          {getTimelineOptions().map((time, idx) => (
                            <option key={idx} value={time.label}>
                              {time.label}
                            </option>
                          ))}
                          <option value="custom">Custom Timeline</option>
                        </select>
                      </div>
                      
                      {formData.timeline === "custom" && (
                        <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                          <Label>Custom Timeline *</Label>
                          <div className="flex gap-2">
                            <Input
                              name="customTimelineValue"
                              type="number"
                              value={formData.customTimelineValue}
                              onChange={handleChange}
                              required
                              placeholder="Value"
                              className="bg-background flex-1"
                            />
                            <select
                              name="customTimelineUnit"
                              value={formData.customTimelineUnit}
                              onChange={handleChange}
                              className="h-11 px-4 rounded-lg bg-background border border-input text-foreground"
                            >
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                              <option value="months">Months</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Show suggested features if project type has them */}
                  {selectedProjectType?.features && selectedProjectType.features.length > 0 && (
                    <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm font-medium mb-2">Common features for {selectedProjectType.name}:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedProjectType.features.map((feature, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

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
