import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
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
import { Service } from "@/types/service";
import { Loader2, Plus, Trash2 } from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useState } from "react";

const serviceFormSchema = z.object({
  icon: z.string().min(1, "Icon name is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  features: z.array(z.string()).min(1, "At least one feature is required"),
  actionButtonLabel: z.string().optional(),
  actionButtonUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  statusTag: z.string().optional(),
  content: z.string().optional(),
  isHidden: z.boolean().default(false),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  initialData?: Service;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const lucideIcons = [
  "Code2", "Palette", "Server", "Cpu", "Cloud", "MessageSquare", 
  "Database", "Smartphone", "Zap", "Shield", "Rocket", "Box",
  "Package", "Settings", "Layout", "Globe", "Monitor", "Workflow"
];

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

export function ServiceForm({ initialData, onSubmit, onCancel, isLoading }: ServiceFormProps) {
  const [features, setFeatures] = useState<string[]>(initialData?.features || ['']);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      icon: initialData?.icon || "",
      title: initialData?.title || "",
      description: initialData?.description || "",
      features: initialData?.features || [''],
      actionButtonLabel: initialData?.actionButton?.label || "",
      actionButtonUrl: initialData?.actionButton?.url || "",
      statusTag: initialData?.statusTag || "",
      content: initialData?.content || "",
      isHidden: initialData?.isHidden || false,
    },
  });

  const handleSubmit = (values: ServiceFormValues) => {
    const submitData = {
      icon: values.icon,
      title: values.title,
      description: values.description,
      features: features.filter(f => f.trim() !== ''),
      actionButton: values.actionButtonLabel && values.actionButtonUrl 
        ? { label: values.actionButtonLabel, url: values.actionButtonUrl }
        : undefined,
      statusTag: values.statusTag || null,
      content: values.content || '',
      contentImages: [], // Extract from content if needed
      isHidden: values.isHidden,
    };
    onSubmit(submitData);
  };

  const addFeature = () => {
    setFeatures([...features, '']);
  };

  const removeFeature = (index: number) => {
    const newFeatures = features.filter((_, i) => i !== index);
    setFeatures(newFeatures.length > 0 ? newFeatures : ['']);
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
    form.setValue('features', newFeatures);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="icon">Icon</Label>
          <Select onValueChange={(value) => form.setValue("icon", value)} value={form.watch("icon")}>
            <SelectTrigger>
              <SelectValue placeholder="Select an icon" />
            </SelectTrigger>
            <SelectContent>
              {lucideIcons.map((icon) => (
                <SelectItem key={icon} value={icon}>
                  {icon}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.icon && (
            <p className="text-destructive text-sm">{form.formState.errors.icon.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...form.register("title")} placeholder="Custom Web Development" />
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
          placeholder="Brief description of the service..."
          rows={3}
        />
        {form.formState.errors.description && (
          <p className="text-destructive text-sm">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Features</Label>
        {features.map((feature, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={feature}
              onChange={(e) => updateFeature(index, e.target.value)}
              placeholder="Feature description"
            />
            {features.length > 1 && (
              <Button type="button" variant="outline" size="icon" onClick={() => removeFeature(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addFeature} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Add Feature
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="actionButtonLabel">Action Button Label (Optional)</Label>
          <Input id="actionButtonLabel" {...form.register("actionButtonLabel")} placeholder="Visit" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="actionButtonUrl">Action Button URL (Optional)</Label>
          <Input id="actionButtonUrl" {...form.register("actionButtonUrl")} placeholder="https://example.com" />
          {form.formState.errors.actionButtonUrl && (
            <p className="text-destructive text-sm">{form.formState.errors.actionButtonUrl.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="statusTag">Status Tag (Optional)</Label>
        <Input id="statusTag" {...form.register("statusTag")} placeholder="Coming Soon" />
        <p className="text-xs text-muted-foreground">Leave blank to hide status tag</p>
      </div>

      <div className="space-y-2">
        <Label>Service Content (Blog)</Label>
        <Controller
          name="content"
          control={form.control}
          render={({ field }) => (
            <ReactQuill 
              theme="snow" 
              value={field.value} 
              onChange={field.onChange}
              modules={modules}
              className="bg-background"
            />
          )}
        />
        <p className="text-xs text-muted-foreground">Rich text content for the service detail page</p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isHidden"
          checked={form.watch("isHidden")}
          onCheckedChange={(checked) => form.setValue("isHidden", checked as boolean)}
        />
        <Label htmlFor="isHidden">Hide from public site</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Save Changes" : "Create Service"}
        </Button>
      </div>
    </form>
  );
}
