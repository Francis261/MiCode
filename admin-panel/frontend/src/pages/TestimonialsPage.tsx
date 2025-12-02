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
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Star } from "lucide-react";
import { Testimonial } from "@/types/testimonial";
import {
  useAdminTestimonials,
  useCreateTestimonial,
  useUpdateTestimonial,
  useDeleteTestimonial,
} from "@/hooks/useAdminTestimonials";
import { TestimonialForm } from "@/components/admin/testimonial-form";
import { toast } from "sonner";

const TestimonialsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [viewingTestimonial, setViewingTestimonial] = useState<Testimonial | null>(null);

  const { data: testimonials, isLoading, error } = useAdminTestimonials();
  const createTestimonialMutation = useCreateTestimonial();
  const updateTestimonialMutation = useUpdateTestimonial();
  const deleteTestimonialMutation = useDeleteTestimonial();

  const handleCreateTestimonial = (data: any) => {
    createTestimonialMutation.mutate(data, {
      onSuccess: () => {
        setIsFormOpen(false);
      },
    });
  };

  const handleEditTestimonial = (data: any) => {
    if (!editingTestimonial) return;
    updateTestimonialMutation.mutate(
      { id: editingTestimonial._id, ...data },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingTestimonial(null);
        },
      }
    );
  };

  const handleDeleteTestimonial = (id: string) => {
    if (confirm("Are you sure you want to delete this testimonial?")) {
      deleteTestimonialMutation.mutate(id);
    }
  };

  const openCreateForm = () => {
    setEditingTestimonial(null);
    setIsFormOpen(true);
  };

  const openEditForm = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setIsFormOpen(true);
  };

  const openViewDialog = (testimonial: Testimonial) => {
    setViewingTestimonial(testimonial);
    setIsViewOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Testimonials</h1>
            <p className="text-muted-foreground">Manage customer testimonials</p>
          </div>
          <Button onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" /> Add Testimonial
          </Button>
        </div>

        {/* Testimonials Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Testimonials</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading testimonials...</div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Error loading testimonials: {error.message}
              </div>
            ) : testimonials && testimonials.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role & Company</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testimonials.map((testimonial) => (
                    <TableRow key={testimonial._id}>
                      <TableCell>
                        <img
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{testimonial.name}</TableCell>
                      <TableCell>
                        {testimonial.role} at {testimonial.company}
                      </TableCell>
                      <TableCell className="max-w-md truncate">{testimonial.content}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: testimonial.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                          ))}
                          <span className="text-sm text-muted-foreground">({testimonial.rating})</span>
                        </div>
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
                            <DropdownMenuItem onClick={() => openViewDialog(testimonial)}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditForm(testimonial)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteTestimonial(testimonial._id)}
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
                No testimonials found. Add your first testimonial!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTestimonial ? "Edit Testimonial" : "Create New Testimonial"}
              </DialogTitle>
            </DialogHeader>
            <TestimonialForm
              initialData={editingTestimonial || undefined}
              onSubmit={editingTestimonial ? handleEditTestimonial : handleCreateTestimonial}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingTestimonial(null);
              }}
              isLoading={createTestimonialMutation.isPending || updateTestimonialMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Testimonial Details</DialogTitle>
            </DialogHeader>
            {viewingTestimonial && (
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-4">
                  <img
                    src={viewingTestimonial.avatar}
                    alt={viewingTestimonial.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-lg">{viewingTestimonial.name}</p>
                    <p className="text-muted-foreground">{viewingTestimonial.role} at {viewingTestimonial.company}</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold">Content:</p>
                  <p className="text-muted-foreground">{viewingTestimonial.content}</p>
                </div>
                <div>
                  <p className="font-semibold">Rating:</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: viewingTestimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                    <span className="text-muted-foreground">({viewingTestimonial.rating} out of 5)</span>
                  </div>
                </div>
                <div>
                  <p className="font-semibold">Created At:</p>
                  <p className="text-muted-foreground">{new Date(viewingTestimonial.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-semibold">Last Updated:</p>
                  <p className="text-muted-foreground">{new Date(viewingTestimonial.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default TestimonialsPage;