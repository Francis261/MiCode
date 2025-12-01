import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  MoreHorizontal,
  Search,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Info,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { ProductForm } from "@/components/admin/product-form";
import {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/useAdminProducts";
import { Product } from "@/types/product";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Filter data (copied from public store for consistency)
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

export default function ProductsPage() {
  const { data: products, isLoading, error } = useAdminProducts();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLanguageFramework, setSelectedLanguageFramework] = useState("all");
  const [selectedTemplateType, setSelectedTemplateType] = useState("all");
  const [showHidden, setShowHidden] = useState(true); // New filter for hidden products

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;

    const matchesLanguageFramework =
      selectedLanguageFramework === "all" ||
      (product.languageFramework && product.languageFramework === selectedLanguageFramework);

    let matchesTemplateType = true;
    if (selectedCategory === "Template" && selectedTemplateType !== "all") {
      matchesTemplateType = (product.templateType && product.templateType === selectedTemplateType) || false;
    }

    const matchesHiddenStatus = showHidden || !product.isHidden;

    return matchesSearch && matchesCategory && matchesLanguageFramework && matchesTemplateType && matchesHiddenStatus;
  }) || [];

  const handleAddProduct = (data: any) => {
    createProductMutation.mutate(data, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const handleEditProduct = (data: any) => {
    if (!editingProduct) return;
    updateProductMutation.mutate(
      { id: editingProduct._id, ...data },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingProduct(null);
        },
      }
    );
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      deleteProductMutation.mutate(productId);
    }
  };

  const handleToggleVisibility = (product: Product) => {
    updateProductMutation.mutate({
      id: product._id,
      isHidden: !product.isHidden,
    });
  };

  const handleViewDetails = (product: Product) => {
    setViewingProduct(product);
    setIsViewDetailsOpen(true);
  };

  if (error) {
    toast.error("Failed to load products.");
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-2xl font-bold">Error loading products</h1>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Products</h1>
          <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select onValueChange={setSelectedCategory} value={selectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={setSelectedLanguageFramework} value={selectedLanguageFramework}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Framework" />
            </SelectTrigger>
            <SelectContent>
              {languageFrameworks.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCategory === "Template" && (
            <Select onValueChange={setSelectedTemplateType} value={selectedTemplateType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Template Type" />
              </SelectTrigger>
              <SelectContent>
                {templateTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Select onValueChange={(value) => setShowHidden(value === "true")} value={showHidden.toString()}>
            <SelectTrigger>
              <SelectValue placeholder="Show Hidden" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Show All</SelectItem>
              <SelectItem value="false">Show Visible Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell>
                        <img
                          src={product.image}
                          alt={product.title}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>${product.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={product.isHidden ? "destructive" : "default"}>
                          {product.isHidden ? "Hidden" : "Visible"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewDetails(product)}>
                              <Info className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleVisibility(product)}>
                              {product.isHidden ? (
                                <Eye className="mr-2 h-4 w-4" />
                              ) : (
                                <EyeOff className="mr-2 h-4 w-4" />
                              )}
                              {product.isHidden ? "Unhide" : "Hide"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteProduct(product._id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add/Edit Product Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                {editingProduct ? "Make changes to the product here." : "Fill in the details to add a new product."}
              </DialogDescription>
            </DialogHeader>
            <ProductForm
              initialData={editingProduct || undefined}
              onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
              onCancel={() => setIsFormOpen(false)}
              isLoading={createProductMutation.isPending || updateProductMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* View Product Details Dialog */}
        <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
              <DialogDescription>Comprehensive information about the product.</DialogDescription>
            </DialogHeader>
            {viewingProduct && (
              <div className="space-y-4 text-sm">
                <img src={viewingProduct.image} alt={viewingProduct.title} className="w-full h-48 object-cover rounded-md mb-4" />
                <p><strong>ID:</strong> {viewingProduct._id}</p>
                <p><strong>Title:</strong> {viewingProduct.title}</p>
                <p><strong>Description:</strong> {viewingProduct.description}</p>
                <p><strong>Price:</strong> ${viewingProduct.price.toFixed(2)}</p>
                {viewingProduct.originalPrice && <p><strong>Original Price:</strong> ${viewingProduct.originalPrice.toFixed(2)}</p>}
                <p><strong>Category:</strong> {viewingProduct.category}</p>
                <p><strong>Tags:</strong> {viewingProduct.tags.join(", ")}</p>
                <p><strong>Rating:</strong> {viewingProduct.rating} ({viewingProduct.reviews} reviews)</p>
                {viewingProduct.languageFramework && <p><strong>Framework:</strong> {viewingProduct.languageFramework}</p>}
                {viewingProduct.templateType && <p><strong>Template Type:</strong> {viewingProduct.templateType}</p>}
                <p><strong>Status:</strong> {viewingProduct.isHidden ? "Hidden" : "Visible"}</p>
                <p className="text-muted-foreground mt-4">
                  *Note: Information about "who has the product" is not available in this admin panel version.
                </p>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setIsViewDetailsOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AdminLayout>
  );
}