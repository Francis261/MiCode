import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import * as LucideIcons from "lucide-react";
import { Seo } from "@/components/Seo"; // Import Seo component

interface Service {
  _id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  actionButton?: {
    label: string;
    url: string;
  };
  statusTag?: string;
  content: string;
  contentImages: string[];
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: service, isLoading, error } = useQuery<Service>({
    queryKey: ["service", id],
    queryFn: () => fetcher<Service>(`/services/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !service) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Service not found</p>
          <Button asChild variant="outline">
            <Link to="/services">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const Icon = (LucideIcons as any)[service.icon] || LucideIcons.HelpCircle;

  return (
    <Layout>
      <Seo
        title={service.title}
        description={service.description}
        keywords={`${service.title}, ${service.features.join(', ')}, DevGorge services`}
        canonicalUrl={`https://devgorge.com/services/${service._id}`}
      />
      {/* Header */}
      <section className="py-12 border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link 
            to="/services" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-6"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <Icon className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                {service.title}
              </h1>
              <p className="text-xl text-muted-foreground">
                {service.description}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Features */}
            {service.features && service.features.length > 0 && (
              <div className="mb-12">
                <h2 className="font-display text-2xl font-bold mb-6">Key Features</h2>
                <ul className="grid md:grid-cols-2 gap-4">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rich Content */}
            {service.content && (
              <div className="mb-12">
                <div 
                  className="prose prose-lg max-w-none
                    prose-headings:font-display prose-headings:font-bold
                    prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-img:rounded-lg prose-img:shadow-lg
                    prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                    prose-pre:bg-muted prose-pre:border prose-pre:border-border"
                  dangerouslySetInnerHTML={{ __html: service.content }}
                />
              </div>
            )}

            {/* Action Button */}
            {service.actionButton && (
              <div className="flex justify-center pt-8 border-t border-border">
                <Button asChild variant="hero" size="lg">
                  <a 
                    href={service.actionButton.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {service.actionButton.label}
                  </a>
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}