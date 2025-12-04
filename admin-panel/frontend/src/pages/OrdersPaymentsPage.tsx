import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminProductOrders } from "@/hooks/useAdminProductOrders";
import { ProductOrder } from "@/types/product-order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, Eye, Edit, Trash2, Loader2, DollarSign, CheckCircle, XCircle, AlertCircle, Download
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  refunded: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function OrdersPaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<ProductOrder>>({});

  const { productOrders, isLoading, pagination, updateProductOrder, deleteProductOrder } = useAdminProductOrders({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const handleStatusChange = (orderId: string, status: string) => {
    updateProductOrder.mutate({ id: orderId, data: { status: status as ProductOrder["status"] } });
  };

  const handleDelete = (order: ProductOrder) => {
    if (confirm(`Are you sure you want to delete order ${order.orderId}?`)) {
      deleteProductOrder.mutate(order._id);
    }
  };

  const openEditDialog = (order: ProductOrder) => {
    setSelectedOrder(order);
    setEditFormData({
      status: order.status,
      adminNotes: order.adminNotes,
      downloadLink: order.downloadLink,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedOrder) return;
    updateProductOrder.mutate({ id: selectedOrder._id, data: editFormData });
    setIsEditOpen(false);
  };

  const handleDownload = (order: ProductOrder) => {
    if (order.downloadLink) {
      window.open(order.downloadLink, "_blank");
    } else {
      // Fallback or generate on demand if not pre-generated
      alert("No direct download link available. Contact support if needed.");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Product Orders</h1>
            <p className="text-muted-foreground">Manage client product purchases and payments</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : productOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p>No product orders found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-mono text-sm">{order.orderId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.clientName}</p>
                          <p className="text-xs text-muted-foreground">{order.clientEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Select 
                          value={order.status} 
                          onValueChange={(v) => handleStatusChange(order._id, v)}
                        >
                          <SelectTrigger className={`w-[130px] h-8 ${statusColors[order.status]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{order.paymentMethod}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { setSelectedOrder(order); setIsViewOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditDialog(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {order.downloadLink && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDownload(order)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(order)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Order Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - {selectedOrder?.orderId}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                {/* Client Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Client Name</Label>
                    <p className="font-medium">{selectedOrder.clientName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedOrder.clientEmail}</p>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Order Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Total Amount</Label>
                      <p className="font-medium text-lg">${selectedOrder.totalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge className={`${statusColors[selectedOrder.status]}`}>
                        {selectedOrder.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Payment Method</Label>
                      <p className="font-medium">{selectedOrder.paymentMethod}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Transaction ID</Label>
                      <p className="font-medium">{selectedOrder.transactionId || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Order Date</Label>
                      <p className="font-medium">
                        {format(new Date(selectedOrder.createdAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Products */}
                {selectedOrder.products && selectedOrder.products.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Products Purchased</h3>
                    <div className="space-y-3">
                      {selectedOrder.products.map((product, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          {product.image && (
                            <img src={product.image} alt={product.title} className="w-12 h-12 object-cover rounded-md" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{product.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.quantity} x ${product.price.toFixed(2)}
                            </p>
                          </div>
                          <p className="font-semibold">${(product.price * product.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedOrder.adminNotes && (
                  <div className="border-t pt-4">
                    <Label className="text-muted-foreground">Admin Notes</Label>
                    <p className="mt-1 whitespace-pre-wrap">{selectedOrder.adminNotes}</p>
                  </div>
                )}

                {/* Download Link */}
                {selectedOrder.downloadLink && (
                  <div className="border-t pt-4">
                    <Label className="text-muted-foreground">Download Link</Label>
                    <a 
                      href={selectedOrder.downloadLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 text-primary hover:underline mt-1"
                    >
                      <Download className="h-4 w-4" />
                      {selectedOrder.downloadLink}
                    </a>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Order - {selectedOrder?.orderId}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(v) => setEditFormData({ ...editFormData, status: v as ProductOrder["status"] })}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-download-link">Download Link (Optional)</Label>
                  <Input
                    id="edit-download-link"
                    value={editFormData.downloadLink || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, downloadLink: e.target.value })}
                    placeholder="https://example.com/download-link"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-admin-notes">Admin Notes</Label>
                  <Textarea
                    id="edit-admin-notes"
                    value={editFormData.adminNotes || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, adminNotes: e.target.value })}
                    rows={4}
                  />
                </div>
                <Button onClick={handleEditSubmit} className="w-full" disabled={updateProductOrder.isPending}>
                  {updateProductOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}