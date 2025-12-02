import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Send, ArrowLeft, X } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";

const Chat = () => {
  const { messages, user, isConnected, showRegistrationForm, registerUser, sendMessage, cancelRegistration } = useChat();
  const [inputValue, setInputValue] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showRegistrationForm]);

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter both name and email",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    const result = await registerUser(regName, regEmail);
    setIsRegistering(false);
    
    if (!result.success) {
      toast({
        title: "Error",
        description: result.message || "Failed to register",
        variant: "destructive",
      });
    } else {
      setRegName("");
      setRegEmail("");
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

  const handleRegKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRegister();
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
                  ) : user ? (
                    <>Connecting...</>
                  ) : (
                    <>Send a message to start chatting</>
                  )}
                </p>
              </div>

              {/* Messages Container */}
              <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !showRegistrationForm && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">Start a conversation...</p>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <motion.div
                    key={message._id || message.odId || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      message.sender === "user" 
                        ? "justify-end" 
                        : message.sender === "system"
                        ? "justify-center"
                        : "justify-start"
                    }`}
                  >
                    {message.sender === "system" ? (
                      <div className="bg-muted/50 text-muted-foreground rounded-lg px-4 py-2 text-sm">
                        {message.message}
                      </div>
                    ) : (
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
                    )}
                  </motion.div>
                ))}

                {/* Inline Registration Form */}
                {showRegistrationForm && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl px-4 py-4 max-w-[90%] w-full">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">Enter your details to continue</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={cancelRegistration}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="reg-name" className="text-xs">Name</Label>
                          <Input
                            id="reg-name"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            onKeyPress={handleRegKeyPress}
                            placeholder="Your name"
                            className="h-9 text-sm bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="reg-email" className="text-xs">Email</Label>
                          <Input
                            id="reg-email"
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            onKeyPress={handleRegKeyPress}
                            placeholder="your@email.com"
                            className="h-9 text-sm bg-background"
                          />
                        </div>
                        <Button
                          onClick={handleRegister}
                          disabled={isRegistering}
                          className="w-full h-9 text-sm"
                        >
                          {isRegistering ? "Please wait..." : "Continue"}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
                
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
                    disabled={showRegistrationForm}
                  />
                  <Button
                    onClick={handleSend}
                    className="bg-primary hover:bg-primary/90"
                    disabled={showRegistrationForm}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
