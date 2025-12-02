import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminUser } from "@/types/admin-user";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const adminUserFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(['superadmin', 'admin', 'editor', 'viewer'], { message: "Invalid role" }),
  isBlocked: z.boolean().default(false),
  // Permissions will be handled separately or derived from role for simplicity in form
});

type AdminUserFormValues = z.infer<typeof adminUserFormSchema>;

interface AdminUserFormProps {
  initialData?: AdminUser;
  onSubmit: (data: AdminUserFormValues & { permissions?: Record<string, string> }) => void;
  onCancel: () => void;
  isLoading: boolean;
  isSuperAdmin: boolean; // To disable superadmin role change
  currentAdminId?: string; // To prevent admin from blocking/changing their own role
}

const defaultPermissions: Record<string, Record<string, string>> = {
  superadmin: {
    dashboard: '*', manageAdmins: '*', products: '*', services: '*', testimonials: '*',
    support: '*', customOrders: '*', ordersPayments: '*', users: '*',
  },
  admin: {
    dashboard: '+', manageAdmins: '-', products: '+', services: '+', testimonials: '+',
    support: '+', customOrders: '+', ordersPayments: '+', users: '+',
  },
  editor: {
    dashboard: '+', manageAdmins: '-', products: '+', services: '+', testimonials: '+',
    support: '-', customOrders: '-', ordersPayments: '-', users: '-',
  },
  viewer: {
    dashboard: '+', manageAdmins: '-', products: '-', services: '-', testimonials: '-',
    support: '-', customOrders: '-', ordersPayments: '-', users: '-',
  },
};

export function AdminUserForm({ initialData, onSubmit, onCancel, isLoading, isSuperAdmin, currentAdminId }: AdminUserFormProps) {
  const form = useForm<AdminUserFormValues>({
    resolver: zodResolver(adminUserFormSchema),
    defaultValues: {
      email: initialData?.email || "",
      password: "", // Password is never pre-filled for security
      role: initialData?.role || "viewer",
      isBlocked: initialData?.isBlocked || false,
    },
  });

  const selectedRole = form.watch("role");
  const isEditingSelf = initialData?._id === currentAdminId;

  const handleSubmit = (values: AdminUserFormValues) => {
    const submitData: AdminUserFormValues & { permissions?: Record<string, string> } = {
      ...values,
    };

    // Only include password if it's provided (not empty string)
    if (!values.password) {
      delete submitData.password;
    }

    // If creating a new user or changing role, apply default permissions for the selected role
    if (!initialData || initialData.role !== values.role) {
      submitData.permissions = defaultPermissions[values.role];
    }
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" {...form.register("email")} placeholder="admin@example.com" />
        {form.formState.errors.email && (
          <p className="text-destructive text-sm">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{initialData ? "New Password (leave blank to keep current)" : "Password"}</Label>
        <Input id="password" type="password" {...form.register("password")} placeholder="********" />
        {form.formState.errors.password && (
          <p className="text-destructive text-sm">{form.formState.errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          onValueChange={(value) => form.setValue("role", value as AdminUserFormValues['role'])}
          value={selectedRole}
          disabled={!isSuperAdmin || (initialData?.role === 'superadmin' && !isEditingSelf)} // Only superadmin can change roles, and cannot change another superadmin's role
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="superadmin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.role && (
          <p className="text-destructive text-sm">{form.formState.errors.role.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isBlocked"
          checked={form.watch("isBlocked")}
          onCheckedChange={(checked) => form.setValue("isBlocked", checked as boolean)}
          disabled={isEditingSelf && initialData?.role === 'superadmin'} // Superadmin cannot block themselves
        />
        <Label htmlFor="isBlocked">Blocked</Label>
        {isEditingSelf && initialData?.role === 'superadmin' && (
          <p className="text-muted-foreground text-xs">(Super Admin cannot block themselves)</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Save Changes" : "Create Admin"}
        </Button>
      </div>
    </form>
  );
}