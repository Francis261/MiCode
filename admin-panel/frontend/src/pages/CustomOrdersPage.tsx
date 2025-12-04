import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminCustomOrders } from "@/hooks/useAdminCustomOrders";
import { CustomOrder } from "@/types/custom-order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, Search, Eye, Edit, Trash2, Mail, DollarSign, Clock, 
  CheckCircle, XCircle, AlertCircle, Loader2, ListTodo, MessageSquare
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  reviewing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  quoted: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  accepted: "bg-green-500/20 text-green-400 border-green-500/30",
  in_progress: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  on_hold: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-400",
  normal: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

export default function CustomOrdersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // Changed initial state to "all"
  const [priorityFilter, setPriorityFilter] = useState<string>("all"); // Changed initial state to "all"
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteTimeline, setQuoteTimeline] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");

  const { orders, isLoading, pagination, updateOrder, deleteOrder, sendQuote } = useAdminCustomOrders({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter, // Pass undefined if "all"
    priority: priorityFilter === "all" ? undefined : priorityFilter, // Pass undefined if "all"
  });

  const handleStatusChange = (orderId: string, status: string) => {
    updateOrder.mutate({ id: orderId, data: { status: status as CustomOrder["status"] } });
  };

  const handlePriorityChange = (orderId: string, priority: string) => {
    updateOrder.mutate({ id: orderId, data: { priority: priority as CustomOrder["priority"] } });
  };


  const handleSendQuote = () => {
    if (!selectedOrder || !quoteAmount || !quoteTimeline) return;
    sendQuote.mutate({
      id: selectedOrder._id,
      quote: { amount: parseFloat(quoteAmount), timeline: quoteTimeline, notes: quoteNotes },
    });
    setQuoteAmount("");
    setQuoteTimeline("");
    setQuoteNotes("");
    setIsQuoteOpen(false);
  };

  const handleDelete = (order: CustomOrder) => {
    if (confirm(`Are you sure you want to delete order ${order.orderId}?`)) {
      deleteOrder.mutate(order._id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Custom Orders</h1>
            <p className="text-muted-foreground">Manage client project requests and quotes</p>
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
                  <SelectItem value="all">All Statuses</SelectItem> {/* Changed value to "all" */}
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem> {/* Changed value to "all" */}
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
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
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p>No orders found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project Type</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order._id} className={!order.viewedByAdmin ? "bg-primary/5" : ""}>
                      <TableCell className="font-mono text-sm">
                        {order.orderId}
                        {!order.viewedByAdmin && (
                          <Badge variant="outline" className="ml-2 text-xs bg-primary/20 text-primary">New</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.clientName}</p>
                          <p className="text-xs text-muted-foreground">{order.clientEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.projectType === "Other" ? order.customProjectType : order.projectType}
                      </TableCell>
                      <TableCell>{order.budget === "Other" ? `Custom` : order.budget}</TableCell>
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
                            <SelectItem value="reviewing">Reviewing</SelectItem>
                            <SelectItem value="quoted">Quoted</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={order.priority} 
                          onValueChange={(v) => handlePriorityChange(order._id, v)}
                        >
                          <SelectTrigger className={`w-[100px] h-8 ${priorityColors[order.priority]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
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
                            onClick={() => navigate(`/custom-orders/${order._id}/communication`)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => { setSelectedOrder(order); setIsQuoteOpen(true); }}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
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
                  {selectedOrder.clientCompany && (
                    <div>
                      <Label className="text-muted-foreground">Company</Label>
                      <p className="font-medium">{selectedOrder.clientCompany}</p>
                    </div>
                  )}
                  {selectedOrder.clientPhone && (
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedOrder.clientPhone}</p>
                    </div>
                  )}
                </div>

                {/* Project Details */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Project Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Project Type</Label>
                      <p className="font-medium">
                        {selectedOrder.projectType === "Other" ? selectedOrder.customProjectType : selectedOrder.projectType}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Budget</Label>
                      <p className="font-medium">
                        {selectedOrder.budget === "Other" 
                          ? `$${selectedOrder.customBudget?.min} - $${selectedOrder.customBudget?.max}`
                          : selectedOrder.budget}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Timeline</Label>
                      <p className="font-medium">
                        {selectedOrder.timeline === "Other"
                          ? `${selectedOrder.customTimeline?.value} ${selectedOrder.customTimeline?.unit}`
                          : selectedOrder.timeline}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedOrder.description}</p>
                </div>

                {selectedOrder.features && (
                  <div className="border-t pt-4">
                    <Label className="text-muted-foreground">Features & Requirements</Label>
                    <p className="mt-1 whitespace-pre-wrap">{selectedOrder.features}</p>
                  </div>
                )}

                {/* Quote Info */}
                {selectedOrder.quotedAmount && (
                  <div className="border-t pt-4 bg-primary/5 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Quote Information</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Amount</Label>
                        <p className="font-medium text-lg">${selectedOrder.quotedAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Timeline</Label>
                        <p className="font-medium">{selectedOrder.quotedTimeline}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Sent On</Label>
                        <p className="font-medium">
                          {selectedOrder.quoteSentAt && format(new Date(selectedOrder.quoteSentAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    {selectedOrder.quoteNotes && (
                      <div className="mt-3">
                        <Label className="text-muted-foreground">Notes</Label>
                        <p className="mt-1">{selectedOrder.quoteNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                {selectedOrder.messages && selectedOrder.messages.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Communication History</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedOrder.messages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-lg ${
                            msg.sender === "admin" ? "bg-primary/10 ml-8" : "bg-muted mr-8"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium">
                              {msg.sender === "admin" ? "Admin" : selectedOrder.clientName}
                            </span>
                            {msg.createdAt && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                              </span>
                            )}
                          </div>
                          {msg.isEmail && msg.emailSubject && (
                            <p className="text-xs text-muted-foreground mb-1">Subject: {msg.emailSubject}</p>
                          )}
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>



        {/* Send Quote Dialog */}
        <Dialog open={isQuoteOpen} onOpenChange={setIsQuoteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Quote - {selectedOrder?.orderId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Quote Amount ($)</Label>
                <Input
                  type="number"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="5000"
                />
              </div>
              <div>
                <Label>Estimated Timeline</Label>
                <Input
                  value={quoteTimeline}
                  onChange={(e) => setQuoteTimeline(e.target.value)}
                  placeholder="4-6 weeks"
                />
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Additional details about the quote..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSendQuote} className="w-full" disabled={sendQuote.isPending}>
                {sendQuote.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                Send Quote
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}