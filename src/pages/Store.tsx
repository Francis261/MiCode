import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, XCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts"; // Import useProducts hook

// Filter data (moved from src/data/products.ts)
const categories = [
  { value: "all", label: "All" },
  { value: "Template", label: "Templates" },
  { value: "API", label: "APIs" },
  { value: "Component", label: "Components" },
  { value: "Tool", label: "Tools" },
];

const languageFrameworks = [
  { value: "all", label: "All" },
  { value: "React", label: "React" },
  { value: "Next.js", label: "Next.js" },
  { value: "Node.js", label: "Node.js" },
  { value: "TypeScript", label: "TypeScript" },
  { value: "Vue", label: "Vue" },
  { value: "Python", label: "Python" },
];

const templateTypes = [
  { value: "all", label: "All" },
  { value: "Dashboard", label: "Dashboard" },
  { value: "E-commerce", label: "E-commerce" },
  { value: "Portfolio", label: "Portfolio" },
  { value: "Blog", label: "Blog" },
  { value: "Landing Page", label: "Landing Page" },
  { value: "Login/Signup", label: "Login/Signup" },
];

export default function Store() {
  const { data: products, isLoading, error } = useProducts(); // Fetch products
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 150]);
  const [selectedLanguageFramework, setSelectedLanguageFramework] = useState("all");
  const [selectedTemplateType, setSelectedTemplateType] = useState("all");

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    
    const matchesLanguageFramework = 
      selectedLanguageFramework === "all" || 
      (product.languageFramework && product.languageFramework === selectedLanguageFramework);

    let matchesTemplateType = true;
    if (selectedCategory === "Template" && selectedTemplateType !== "all") {
      matchesTemplateType = (product.templateType && product.templateType === selectedTemplateType) || false;
    }
    
    return matchesSearch && matchesCategory && matchesPrice && matchesLanguageFramework && matchesTemplateType;
  }) || [];

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setPriceRange([0, 150]);
    setSelectedLanguageFramework("all");
    setSelectedTemplateType("all");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className="text-destructive">Error loading products: {error.message}</p>
        </div>
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
            Digital Marketplace
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-2xl"
          >
            Browse our collection of premium templates, APIs, tools, and digital products.
          </motion.p>
        </div>
      </section>

      {/* Filters & Products */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Search & Main Category Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col lg:flex-row gap-4 mb-8"
          >
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-card border-border"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              {categories.map((category) => (
                <Button
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "outline"}
                  size="lg"
                  onClick={() => {
                    setSelectedCategory(category.value);
                    setSelectedTemplateType("all"); // Reset template type when main category changes
                  }}
                  className="whitespace-nowrap"
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Advanced Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-6 mb-8 space-y-6"
          >
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Advanced Filters
            </h2>

            {/* Price Range Slider */}
            <div className="space-y-2">
              <Label htmlFor="price-range">Price Range: ${priceRange[0]} - ${priceRange[1]}</Label>
              <Slider
                id="price-range"
                min={0}
                max={200} // Adjust max based on your product data
                step={5}
                value={priceRange}
                onValueChange={(value) => setPriceRange(value as [number, number])}
                className="w-full"
              />
            </div>

            {/* Language/Framework Filter */}
            <div className="space-y-2">
              <Label>Language/Framework</Label>
              <div className="flex flex-wrap gap-2">
                {languageFrameworks.map((lang) => (
                  <Button
                    key={lang.value}
                    variant={selectedLanguageFramework === lang.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedLanguageFramework(lang.value)}
                    className="whitespace-nowrap"
                  >
                    {lang.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conditional Template Type Filter */}
            {selectedCategory === "Template" && (
              <div className="space-y-2">
                <Label>Template Type</Label>
                <div className="flex flex-wrap gap-2">
                  {templateTypes.map((type) => (
                    <Button
                      key={type.value}
                      variant={selectedTemplateType === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTemplateType(type.value)}
                      className="whitespace-nowrap"
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters Button */}
            <Button variant="ghost" onClick={handleClearFilters} className="text-muted-foreground hover:text-foreground">
              <XCircle className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          </motion.div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-8">
            <p className="text-muted-foreground">
              Showing <span className="text-foreground font-medium">{filteredProducts.length}</span> products
            </p>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product._id} {...product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No products found matching your criteria.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}