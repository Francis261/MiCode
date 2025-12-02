import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2, Ban, CheckCircle, Loader2 } from "lucide-react";
import { AdminUser } from "@/types/admin-user";
import {
  useAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeleteAdminUser,
} from "@/hooks/useAdminUsers";
import { AdminUserForm } from "@/components/admin/admin-user-form";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

const ManageAdminsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

  const { data: adminUsers, isLoading, error } = useAdminUsers();
  const createAdminUserMutation = useCreateAdminUser();
  const updateAdminUserMutation = useUpdateAdminUser();
  const deleteAdminUserMutation = useDeleteAdminUser();
  const { admin: currentAdmin, checkPermission } = useAuth();

  // Ensure only superadmin can access this page
  if (!currentAdmin || currentAdmin.role !== 'superadmin') {
    // This should ideally be handled by PrivateRoute, but as a fallback
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </AdminLayout>
    );
  }

  const handleCreateAdmin = (data: any) => {
    createAdminUserMutation.mutate(data, {
      onSuccess: () => {
        setIsFormOpen(false);
      },
    });
  };

  const handleEditAdmin = (data: any) => {
    if (!editingAdmin) return;

    // Prevent superadmin from changing their own role to non-superadmin
    if (editingAdmin._id === currentAdmin._id && editingAdmin.role === 'superadmin' && data.role !== 'superadmin') {
      toast.error("Super Admin cannot change their own role.");
      return;
    }
    // Prevent superadmin from blocking themselves
    if (editingAdmin._id === currentAdmin._id && data.isBlocked) {
      toast.error("Super Admin cannot block themselves.");
      return;
    }

    updateAdminUserMutation.mutate(
      { id: editingAdmin._id, ...data },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingAdmin(null);
        },
      }
    );
  };

  const handleDeleteAdmin = (id: string) => {
    if (id === currentAdmin._id) {
      toast.error("You cannot delete your own account.");
      return;
    }
    if (confirm("Are you sure you want to delete this admin user? This action cannot be undone.")) {
      deleteAdminUserMutation.mutate(id);
    }
  };

  const handleToggleBlock = (adminUser: AdminUser) => {
    if (adminUser._id === currentAdmin._id) {
      toast.error("You cannot block/unblock your own account.");
      return;
    }
    updateAdminUserMutation.mutate({
      id: adminUser._id,
      isBlocked: !adminUser.isBlocked,
    });
  };

  const openCreateForm = () => {
    setEditingAdmin(null);
    setIsFormOpen(true);
  };

  const openEditForm = (adminUser: AdminUser) => {
    setEditingAdmin(adminUser);
    setIsFormOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Manage Admins</h1>
            <p className="text-muted-foreground">Create and manage admin users and their permissions</p>
          </div>
          <Button onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" /> Add Admin
          </Button>
        </div>

        {/* Admin Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-2">Loading admin users...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Error loading admin users: {error.message}
              </div>
            ) : adminUsers && adminUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((adminUser) => (
                    <TableRow key={adminUser._id}>
                      <TableCell className="font-medium">{adminUser.email}</TableCell>
                      <TableCell className="capitalize">{adminUser.role}</TableCell>
                      <TableCell>
                        <Badge variant={adminUser.isBlocked ? "destructive" : "default"}>
                          {adminUser.isBlocked ? "Blocked" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(adminUser.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditForm(adminUser)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleBlock(adminUser)}>
                              {adminUser.isBlocked ? (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" /> Unblock
                                </>
                              ) : (
                                <>
                                  <Ban className="mr-2 h-4 w-4" /> Block
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteAdmin(adminUser._id)}
                              className="text-destructive"
                              disabled={adminUser._id === currentAdmin._id} // Prevent deleting self
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No admin users found. Create your first admin!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAdmin ? "Edit Admin User" : "Create New Admin User"}
              </DialogTitle>
            </DialogHeader>
            <AdminUserForm
              initialData={editingAdmin || undefined}
              onSubmit={editingAdmin ? handleEditAdmin : handleCreateAdmin}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingAdmin(null);
              }}
              isLoading={createAdminUserMutation.isPending || updateAdminUserMutation.isPending}
              isSuperAdmin={currentAdmin.role === 'superadmin'}
              currentAdminId={currentAdmin._id}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ManageAdminsPage;