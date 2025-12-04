import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminCustomOrders } from "@/hooks/useAdminCustomOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Send, Mail, MessageSquare, Loader2, User, Clock
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetcher } from "@/lib/api";
import { CustomOrder } from "@/types/custom-order";
import { toast } from "sonner";

export default function OrderCommunicationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<"email" | "chat">("chat");
  const [chatMessage, setChatMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['admin-custom-order', orderId],
    queryFn: () => adminFetcher<CustomOrder>(`/api/custom-orders/${orderId}`),
    enabled: !!orderId,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { message: string; isEmail?: boolean; emailSubject?: string; senderName?: string }) =>
      adminFetcher<CustomOrder>(`/api/custom-orders/${orderId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-order', orderId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeTab === "chat" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [order?.messages, activeTab]);

  const handleSendChat = async () => {
    if (!chatMessage.trim()) return;
    
    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync({
        message: chatMessage,
        isEmail: false,
        senderName: "Admin",
      });
      setChatMessage("");
      toast.success("Message sent");
    } catch (err) {
      // Error handled in mutation
    } finally {
      setIsSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Please fill in both subject and message");
      return;
    }
    
    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync({
        message: emailBody,
        isEmail: true,
        emailSubject: emailSubject,
        senderName: "Admin",
      });
      setEmailSubject("");
      setEmailBody("");
      toast.success("Email sent successfully");
    } catch (err) {
      // Error handled in mutation
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && activeTab === "chat") {
      e.preventDefault();
      handleSendChat();
    }
  };

  // Filter messages by type
  const chatMessages = order?.messages?.filter(msg => !msg.isEmail) || [];
  const emailMessages = order?.messages?.filter(msg => msg.isEmail) || [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <p className="text-destructive">Failed to load order</p>
          <Button onClick={() => navigate("/custom-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/custom-orders")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Communication - {order.orderId}</h1>
            <p className="text-muted-foreground">
              {order.clientName} • {order.clientEmail}
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {order.status.replace("_", " ").toUpperCase()}
          </Badge>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Communication Panel */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-220px)]">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "chat")} className="h-full flex flex-col">
                <CardHeader className="pb-2">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                      {chatMessages.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                          {chatMessages.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                      {emailMessages.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                          {emailMessages.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                {/* Chat Tab */}
                <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                        <p>No chat messages yet</p>
                        <p className="text-sm">Start a conversation with the client</p>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.sender === "admin"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-3 w-3" />
                              <span className="text-xs font-medium">
                                {msg.senderName || msg.sender}
                              </span>
                              <Clock className="h-3 w-3 ml-auto" />
                              <span className="text-xs opacity-70">
                                {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </CardContent>
                  
                  {/* Chat Input */}
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isSending}
                      />
                      <Button onClick={handleSendChat} disabled={isSending || !chatMessage.trim()}>
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Email Tab */}
                <TabsContent value="email" className="flex-1 flex flex-col overflow-hidden m-0">
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Email History */}
                    {emailMessages.length > 0 && (
                      <div className="space-y-3 mb-6">
                        <Label className="text-muted-foreground">Email History</Label>
                        {emailMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`border rounded-lg p-3 ${
                              msg.sender === "admin" ? "border-primary/30 bg-primary/5" : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium">
                                {msg.sender === "admin" ? "Sent to client" : "From client"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.createdAt), "MMM d, yyyy h:mm a")}
                              </span>
                            </div>
                            {msg.emailSubject && (
                              <p className="font-medium text-sm mb-1">Subject: {msg.emailSubject}</p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Compose Email */}
                    <div className="space-y-4">
                      <Label className="text-lg font-medium">Compose Email</Label>
                      <div className="space-y-2">
                        <Label htmlFor="email-to">To</Label>
                        <Input
                          id="email-to"
                          value={order.clientEmail}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-subject">Subject</Label>
                        <Input
                          id="email-subject"
                          placeholder="Enter email subject..."
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-body">Message</Label>
                        <Textarea
                          id="email-body"
                          placeholder="Write your email message..."
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          rows={8}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </CardContent>
                  
                  {/* Email Send Button */}
                  <div className="border-t p-4">
                    <Button 
                      onClick={handleSendEmail} 
                      disabled={isSending || !emailSubject.trim() || !emailBody.trim()}
                      className="w-full"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Send Email
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Name</Label>
                  <p className="font-medium">{order.clientName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="text-sm">{order.clientEmail}</p>
                </div>
                {order.clientPhone && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Phone</Label>
                    <p className="text-sm">{order.clientPhone}</p>
                  </div>
                )}
                {order.clientCompany && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Company</Label>
                    <p className="text-sm">{order.clientCompany}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Project Type</Label>
                  <p className="font-medium">
                    {order.projectType === "Other" ? order.customProjectType : order.projectType}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Budget</Label>
                  <p className="text-sm">{order.budget}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Timeline</Label>
                  <p className="text-sm">{order.timeline}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Created</Label>
                  <p className="text-sm">
                    {format(new Date(order.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {order.quotedAmount && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quote</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Amount</Label>
                    <p className="font-bold text-lg text-primary">
                      ${order.quotedAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Timeline</Label>
                    <p className="text-sm">{order.quotedTimeline}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
