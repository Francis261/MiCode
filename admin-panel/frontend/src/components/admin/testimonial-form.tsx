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
import { Testimonial } from "@/types/testimonial";
import { Loader2 } from "lucide-react";

const testimonialFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  company: z.string().min(1, "Company is required"),
  avatar: z.string().url("Must be a valid avatar URL"),
  content: z.string().min(1, "Content is required"),
  rating: z.coerce.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
});

type TestimonialFormValues = z.infer<typeof testimonialFormSchema>;

interface TestimonialFormProps {
  initialData?: Testimonial;
  onSubmit: (data: TestimonialFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function TestimonialForm({ initialData, onSubmit, onCancel, isLoading }: TestimonialFormProps) {
  const form = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      role: initialData?.role || "",
      company: initialData?.company || "",
      avatar: initialData?.avatar || "",
      content: initialData?.content || "",
      rating: initialData?.rating || 5,
    },
  });

  const handleSubmit = (values: TestimonialFormValues) => {
    onSubmit(values);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...form.register("name")} placeholder="John Doe" />
          {form.formState.errors.name && (
            <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" {...form.register("role")} placeholder="CTO" />
          {form.formState.errors.role && (
            <p className="text-destructive text-sm">{form.formState.errors.role.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input id="company" {...form.register("company")} placeholder="Tech Solutions Inc." />
        {form.formState.errors.company && (
          <p className="text-destructive text-sm">{form.formState.errors.company.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar">Avatar URL</Label>
        <Input id="avatar" {...form.register("avatar")} placeholder="https://example.com/avatar.jpg" />
        {form.formState.errors.avatar && (
          <p className="text-destructive text-sm">{form.formState.errors.avatar.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Testimonial Content</Label>
        <Textarea
          id="content"
          {...form.register("content")}
          placeholder="This product changed our workflow for the better..."
          rows={5}
        />
        {form.formState.errors.content && (
          <p className="text-destructive text-sm">{form.formState.errors.content.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rating">Rating (1-5 Stars)</Label>
        <Select onValueChange={(value) => form.setValue("rating", parseInt(value))} value={form.watch("rating")?.toString()}>
          <SelectTrigger>
            <SelectValue placeholder="Select rating" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((r) => (
              <SelectItem key={r} value={r.toString()}>
                {r} Star{r > 1 ? 's' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.rating && (
          <p className="text-destructive text-sm">{form.formState.errors.rating.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Save Changes" : "Create Testimonial"}
        </Button>
      </div>
    </form>
  );
}