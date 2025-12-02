import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Send, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";

const Chat = () => {
  const { messages, user, isConnected, needsRegistration, registerUser, sendMessage } = useChat();
  const [inputValue, setInputValue] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Error",
        description: "Please enter both name and email",
        variant: "destructive",
      });
      return;
    }

    const result = await registerUser(name, email);
    if (!result.success) {
      toast({
        title: "Error",
        description: result.message || "Failed to register",
        variant: "destructive",
      });
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] bg-background py-8">
        <div className="container max-w-3xl mx-auto px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="p-4 border-b border-border">
                <h1 className="text-xl font-display font-bold">Live Chat</h1>
                <p className="text-sm text-muted-foreground">
                  {isConnected ? (
                    <>Connected • We typically reply within a few minutes</>
                  ) : (
                    <>Connecting...</>
                  )}
                </p>
              </div>

              {needsRegistration ? (
                /* Registration Form */
                <div className="p-6 space-y-4">
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-semibold">Welcome to our chat!</h2>
                    <p className="text-sm text-muted-foreground">
                      Please provide your details to continue
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                  <Button
                    onClick={handleRegister}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    Continue
                  </Button>
                </div>
              ) : (
                <>
                  {/* Messages Container */}
                  <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p className="text-sm">Start a conversation...</p>
                      </div>
                    )}
                    {messages.map((message, index) => (
                      <motion.div
                        key={message._id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          message.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            message.sender === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.sender === "user"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1 bg-muted/50 border-border/50"
                        disabled={!isConnected}
                      />
                      <Button
                        onClick={handleSend}
                        className="bg-primary hover:bg-primary/90"
                        disabled={!isConnected}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
