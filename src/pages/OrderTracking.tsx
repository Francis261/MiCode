import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Package, MessageSquare, User, Mail, Phone, Building, Calendar, DollarSign, Clock, CheckCircle, AlertCircle, Send, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface Developer {
  name?: string;
  email?: string;
  phone?: string;
  rank?: string;
  profilePhoto?: string;
  skills?: string[];
  bio?: string;
}

interface CostItem {
  description: string;
  amount: number;
  quantity: number;
}

interface Payment {
  amount: number;
  method?: string;
  transactionId?: string;
  paidAt: string;
  notes?: string;
}

interface Message {
  _id?: string;
  sender: 'admin' | 'client';
  senderName?: string;
  message: string;
  createdAt?: string;
}

interface Order {
  _id: string;
  orderId: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  clientPhone?: string;
  projectType: string;
  customProjectType?: string;
  budget: string;
  timeline: string;
  description: string;
  features?: string;
  techStack?: string[];
  status: string;
  priority: string;
  quotedAmount?: number;
  quotedTimeline?: string;
  quoteNotes?: string;
  startDate?: string;
  expectedEndDate?: string;
  developer?: Developer;
  costItems?: CostItem[];
  totalCost?: number;
  payments?: Payment[];
  totalPaid?: number;
  messages?: Message[];
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending Review", color: "bg-yellow-500/20 text-yellow-400", icon: <Clock className="h-4 w-4" /> },
  reviewing: { label: "Under Review", color: "bg-blue-500/20 text-blue-400", icon: <Search className="h-4 w-4" /> },
  quoted: { label: "Quote Sent", color: "bg-purple-500/20 text-purple-400", icon: <DollarSign className="h-4 w-4" /> },
  accepted: { label: "Accepted", color: "bg-green-500/20 text-green-400", icon: <CheckCircle className="h-4 w-4" /> },
  in_progress: { label: "In Progress", color: "bg-primary/20 text-primary", icon: <Package className="h-4 w-4" /> },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400", icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-400", icon: <AlertCircle className="h-4 w-4" /> },
  on_hold: { label: "On Hold", color: "bg-gray-500/20 text-gray-400", icon: <AlertCircle className="h-4 w-4" /> },
};

export default function OrderTracking() {
  const { toast } = useToast();
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !email.trim()) {
      toast({ title: "Error", description: "Please enter both Order ID and Email", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/custom-orders/track/${orderId}?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Order not found");
      }

      setOrder(data);
    } catch (error) {
      toast({
        title: "Order Not Found",
        description: error instanceof Error ? error.message : "Please check your Order ID and email",
        variant: "destructive",
      });
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !order) return;

    setIsSendingMessage(true);
    try {
      const response = await fetch(`${API_BASE}/api/custom-orders/track/${order.orderId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message: newMessage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send message");
      }

      setOrder({ ...order, messages: data.messages });
      setNewMessage("");
      toast({ title: "Message Sent", description: "Your message has been sent successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const status = order?.status ? statusConfig[order.status] : null;
  const amountRemaining = (order?.totalCost || 0) - (order?.totalPaid || 0);

  return (
    <Layout>
      <section className="py-12 min-h-screen">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Track Your Order</h1>
            <p className="text-muted-foreground text-lg">
              Enter your Order ID and email to view your project details
            </p>
          </motion.div>

          {/* Search Form */}
          <Card variant="glass" className="mb-8">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Order ID (e.g., ORD-ABC123-0001)"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="flex-1 bg-background"
                />
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-background"
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  {isLoading ? "Searching..." : "Track Order"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Order Details */}
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Status Header */}
              <Card variant="glass" className="mb-6">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p className="font-display text-2xl font-bold text-primary">{order.orderId}</p>
                    </div>
                    {status && (
                      <Badge className={`${status.color} flex items-center gap-2 px-4 py-2`}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Messages
                    {order.messages && order.messages.length > 0 && (
                      <Badge variant="secondary" className="ml-1">{order.messages.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-6">
                  {/* Client Info */}
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Client Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{order.clientName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{order.clientEmail}</p>
                        </div>
                      </div>
                      {order.clientPhone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{order.clientPhone}</p>
                          </div>
                        </div>
                      )}
                      {order.clientCompany && (
                        <div className="flex items-center gap-3">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Company</p>
                            <p className="font-medium">{order.clientCompany}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Project Details */}
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Project Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Project Type</p>
                          <p className="font-medium">{order.customProjectType || order.projectType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Budget</p>
                          <p className="font-medium">{order.budget}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Timeline</p>
                          <p className="font-medium">{order.quotedTimeline || order.timeline}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Submitted On</p>
                          <p className="font-medium">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Description</p>
                        <p className="text-foreground">{order.description}</p>
                      </div>
                      {order.features && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Features</p>
                          <p className="text-foreground">{order.features}</p>
                        </div>
                      )}
                      {order.techStack && order.techStack.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Tech Stack</p>
                          <div className="flex flex-wrap gap-2">
                            {order.techStack.map((tech, idx) => (
                              <Badge key={idx} variant="secondary">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Developer Info */}
                  {order.developer?.name && (
                    <Card variant="glass">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Your Developer
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={order.developer.profilePhoto} alt={order.developer.name} />
                            <AvatarFallback className="text-lg">
                              {order.developer.name?.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="font-display text-lg font-bold">{order.developer.name}</p>
                              {order.developer.rank && (
                                <Badge variant="outline">{order.developer.rank}</Badge>
                              )}
                            </div>
                            {order.developer.email && (
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {order.developer.email}
                              </p>
                            )}
                            {order.developer.phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {order.developer.phone}
                              </p>
                            )}
                            {order.developer.bio && (
                              <p className="text-sm text-muted-foreground">{order.developer.bio}</p>
                            )}
                            {order.developer.skills && order.developer.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {order.developer.skills.map((skill, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">{skill}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Cost Breakdown */}
                  {order.costItems && order.costItems.length > 0 && (
                    <Card variant="glass">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Project Costs
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {order.costItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{item.description}</p>
                                {item.quantity > 1 && (
                                  <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                                )}
                              </div>
                              <p className="font-medium">{formatCurrency(item.amount * item.quantity)}</p>
                            </div>
                          ))}
                          <Separator />
                          <div className="flex justify-between items-center font-bold text-lg">
                            <p>Total</p>
                            <p className="text-primary">{formatCurrency(order.totalCost)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Payment Status */}
                  {(order.totalCost || order.payments?.length) && (
                    <Card variant="glass">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Payment Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid sm:grid-cols-3 gap-4 mb-4">
                          <div className="bg-background/50 rounded-lg p-4 text-center">
                            <p className="text-sm text-muted-foreground">Total Cost</p>
                            <p className="font-display text-2xl font-bold">{formatCurrency(order.totalCost)}</p>
                          </div>
                          <div className="bg-green-500/10 rounded-lg p-4 text-center">
                            <p className="text-sm text-green-400">Amount Paid</p>
                            <p className="font-display text-2xl font-bold text-green-400">{formatCurrency(order.totalPaid)}</p>
                          </div>
                          <div className="bg-yellow-500/10 rounded-lg p-4 text-center">
                            <p className="text-sm text-yellow-400">Remaining</p>
                            <p className="font-display text-2xl font-bold text-yellow-400">{formatCurrency(amountRemaining)}</p>
                          </div>
                        </div>
                        {order.payments && order.payments.length > 0 && (
                          <>
                            <Separator className="my-4" />
                            <p className="text-sm text-muted-foreground mb-3">Payment History</p>
                            <div className="space-y-2">
                              {order.payments.map((payment, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-background/30 p-3 rounded-lg">
                                  <div>
                                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(payment.paidAt)} {payment.method && `• ${payment.method}`}
                                    </p>
                                  </div>
                                  <CheckCircle className="h-5 w-5 text-green-400" />
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Timeline */}
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                          <p className="font-medium">{formatDate(order.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Expected End</p>
                          <p className="font-medium">{formatDate(order.expectedEndDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Last Updated</p>
                          <p className="font-medium">{formatDate(order.updatedAt)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Messages Tab */}
                <TabsContent value="messages">
                  <Card variant="glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Conversation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Messages List */}
                      <div className="space-y-4 max-h-96 overflow-y-auto mb-6 p-2">
                        {(!order.messages || order.messages.length === 0) ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No messages yet. Start the conversation!</p>
                          </div>
                        ) : (
                          order.messages.map((msg, idx) => (
                            <div
                              key={msg._id || idx}
                              className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] p-4 rounded-xl ${
                                  msg.sender === 'client'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm font-medium mb-1">
                                  {msg.sender === 'admin' ? (msg.senderName || 'Developer') : 'You'}
                                </p>
                                <p className="text-sm">{msg.message}</p>
                                {msg.createdAt && (
                                  <p className={`text-xs mt-2 ${
                                    msg.sender === 'client' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  }`}>
                                    {new Date(msg.createdAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Send Message */}
                      <div className="flex gap-3">
                        <Textarea
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="bg-background flex-1"
                          rows={2}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={isSendingMessage || !newMessage.trim()}
                          className="self-end"
                        >
                          {isSendingMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </div>
      </section>
    </Layout>
  );
}
