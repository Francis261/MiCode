import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Product } from "@/types/product";
import { Loader2 } from "lucide-react";

const productFormSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().min(0.01, "Price must be positive"),
  originalPrice: z.coerce.number().optional(),
  image: z.string().url("Must be a valid image URL"),
  category: z.string().min(1, "Category is required"),
  tags: z.string().min(1, "Tags are required (comma-separated)"),
  rating: z.coerce.number().min(0).max(5, "Rating must be between 0 and 5"),
  reviews: z.coerce.number().min(0, "Reviews must be non-negative"),
  languageFramework: z.string().optional(),
  templateType: z.string().optional(),
  isHidden: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: ProductFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const categories = ["Template", "API", "Component", "Tool"];
const languageFrameworks = ["React", "Next.js", "Node.js", "TypeScript", "Vue", "Python"];
const templateTypes = ["Dashboard", "E-commerce", "Portfolio", "Blog", "Landing Page", "Login/Signup"];

export function ProductForm({ initialData, onSubmit, onCancel, isLoading }: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      id: initialData?.id || "",
      title: initialData?.title || "",
      description: initialData?.description || "",
      price: initialData?.price || 0,
      originalPrice: initialData?.originalPrice || undefined,
      image: initialData?.image || "",
      category: initialData?.category || "",
      tags: initialData?.tags.join(", ") || "",
      rating: initialData?.rating || 0,
      reviews: initialData?.reviews || 0,
      languageFramework: initialData?.languageFramework || "",
      templateType: initialData?.templateType || "",
      isHidden: initialData?.isHidden || false,
    },
  });

  const handleSubmit = (values: ProductFormValues) => {
    onSubmit({
      ...values,
      tags: values.tags.split(",").map((tag) => tag.trim()),
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="id">Product ID</Label>
          <Input
            id="id"
            {...form.register("id")}
            placeholder="unique-product-id"
            disabled={!!initialData} // Disable ID field for edits
          />
          {form.formState.errors.id && (
            <p className="text-destructive text-sm">{form.formState.errors.id.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...form.register("title")} placeholder="SaaS Dashboard Pro" />
          {form.formState.errors.title && (
            <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="A complete React dashboard template..."
          rows={3}
        />
        {form.formState.errors.description && (
          <p className="text-destructive text-sm">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input id="price" type="number" step="0.01" {...form.register("price")} />
          {form.formState.errors.price && (
            <p className="text-destructive text-sm">{form.formState.errors.price.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="originalPrice">Original Price (Optional)</Label>
          <Input id="originalPrice" type="number" step="0.01" {...form.register("originalPrice")} />
          {form.formState.errors.originalPrice && (
            <p className="text-destructive text-sm">{form.formState.errors.originalPrice.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Image URL</Label>
        <Input id="image" {...form.register("image")} placeholder="https://example.com/image.jpg" />
        {form.formState.errors.image && (
          <p className="text-destructive text-sm">{form.formState.errors.image.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select onValueChange={(value) => form.setValue("category", value)} value={form.watch("category")}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.category && (
            <p className="text-destructive text-sm">{form.formState.errors.category.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input id="tags" {...form.register("tags")} placeholder="React, TypeScript, Tailwind" />
          {form.formState.errors.tags && (
            <p className="text-destructive text-sm">{form.formState.errors.tags.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rating">Rating (0-5)</Label>
          <Input id="rating" type="number" step="0.1" {...form.register("rating")} />
          {form.formState.errors.rating && (
            <p className="text-destructive text-sm">{form.formState.errors.rating.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reviews">Number of Reviews</Label>
          <Input id="reviews" type="number" {...form.register("reviews")} />
          {form.formState.errors.reviews && (
            <p className="text-destructive text-sm">{form.formState.errors.reviews.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="languageFramework">Language/Framework (Optional)</Label>
          <Select onValueChange={(value) => form.setValue("languageFramework", value)} value={form.watch("languageFramework")}>
            <SelectTrigger>
              <SelectValue placeholder="Select framework" />
            </SelectTrigger>
            <SelectContent>
              {languageFrameworks.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.languageFramework && (
            <p className="text-destructive text-sm">{form.formState.errors.languageFramework.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="templateType">Template Type (Optional)</Label>
          <Select onValueChange={(value) => form.setValue("templateType", value)} value={form.watch("templateType")}>
            <SelectTrigger>
              <SelectValue placeholder="Select template type" />
            </SelectTrigger>
            <SelectContent>
              {templateTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.templateType && (
            <p className="text-destructive text-sm">{form.formState.errors.templateType.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isHidden"
          checked={form.watch("isHidden")}
          onCheckedChange={(checked) => form.setValue("isHidden", checked as boolean)}
        />
        <Label htmlFor="isHidden">Hide from public store</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Save Changes" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}