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
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Eye, Edit, Trash2, EyeOff } from "lucide-react";
import { Service } from "@/types/service";
import {
  useAdminServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from "@/hooks/useAdminServices";
import { ServiceForm } from "@/components/admin/service-form";
import { toast } from "sonner";

const ServicesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [viewingService, setViewingService] = useState<Service | null>(null);

  const { data: services, isLoading, error } = useAdminServices();
  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();

  const handleCreateService = (data: any) => {
    createServiceMutation.mutate(data, {
      onSuccess: () => {
        setIsFormOpen(false);
      },
    });
  };

  const handleEditService = (data: any) => {
    if (!editingService) return;
    updateServiceMutation.mutate(
      { id: editingService._id, ...data },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingService(null);
        },
      }
    );
  };

  const handleDeleteService = (id: string) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteServiceMutation.mutate(id);
    }
  };

  const handleToggleVisibility = (service: Service) => {
    updateServiceMutation.mutate({
      id: service._id,
      isHidden: !service.isHidden,
    });
  };

  const openCreateForm = () => {
    setEditingService(null);
    setIsFormOpen(true);
  };

  const openEditForm = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const openViewDialog = (service: Service) => {
    setViewingService(service);
    setIsViewOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Services</h1>
            <p className="text-muted-foreground">Manage your service offerings</p>
          </div>
          <Button onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" /> Add Service
          </Button>
        </div>

        {/* Services Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Services</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading services...</div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Error loading services: {error.message}
              </div>
            ) : services && services.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Icon</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action Button</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service._id}>
                      <TableCell className="font-medium">{service.icon}</TableCell>
                      <TableCell className="font-semibold">{service.title}</TableCell>
                      <TableCell className="max-w-md truncate">{service.description}</TableCell>
                      <TableCell>
                        {service.statusTag ? (
                          <Badge variant="secondary">{service.statusTag}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {service.actionButton ? (
                          <Badge>{service.actionButton.label}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {service.isHidden ? (
                          <Badge variant="destructive">Hidden</Badge>
                        ) : (
                          <Badge variant="default">Visible</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openViewDialog(service)}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditForm(service)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleVisibility(service)}>
                              {service.isHidden ? (
                                <>
                                  <Eye className="mr-2 h-4 w-4" /> Show
                                </>
                              ) : (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" /> Hide
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteService(service._id)}
                              className="text-destructive"
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
                No services found. Create your first service!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Create New Service"}
              </DialogTitle>
            </DialogHeader>
            <ServiceForm
              initialData={editingService || undefined}
              onSubmit={editingService ? handleEditService : handleCreateService}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingService(null);
              }}
              isLoading={createServiceMutation.isPending || updateServiceMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Service Details</DialogTitle>
            </DialogHeader>
            {viewingService && (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold">ID:</p>
                  <p className="text-muted-foreground">{viewingService._id}</p>
                </div>
                <div>
                  <p className="font-semibold">Icon:</p>
                  <p>{viewingService.icon}</p>
                </div>
                <div>
                  <p className="font-semibold">Title:</p>
                  <p>{viewingService.title}</p>
                </div>
                <div>
                  <p className="font-semibold">Description:</p>
                  <p>{viewingService.description}</p>
                </div>
                <div>
                  <p className="font-semibold">Features:</p>
                  <ul className="list-disc list-inside">
                    {viewingService.features.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>
                </div>
                {viewingService.actionButton && (
                  <div>
                    <p className="font-semibold">Action Button:</p>
                    <p>{viewingService.actionButton.label} - {viewingService.actionButton.url}</p>
                  </div>
                )}
                {viewingService.statusTag && (
                  <div>
                    <p className="font-semibold">Status Tag:</p>
                    <Badge variant="secondary">{viewingService.statusTag}</Badge>
                  </div>
                )}
                {viewingService.content && (
                  <div>
                    <p className="font-semibold">Content:</p>
                    <div 
                      className="prose prose-sm max-w-none mt-2 border rounded-lg p-4"
                      dangerouslySetInnerHTML={{ __html: viewingService.content }}
                    />
                  </div>
                )}
                <div>
                  <p className="font-semibold">Visibility:</p>
                  <Badge variant={viewingService.isHidden ? "destructive" : "default"}>
                    {viewingService.isHidden ? "Hidden" : "Visible"}
                  </Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ServicesPage;
