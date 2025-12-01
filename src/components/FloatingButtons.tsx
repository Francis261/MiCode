import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "1234567890"; // Replace with actual number
const WHATSAPP_MESSAGE = "Hello! I'm interested in your products.";

export function FloatingButtons() {
  // const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`; // Removed WhatsApp URL

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* WhatsApp Button - REMOVED */}

      {/* Chat Button */}
      <Link
        to="/chat"
        className="w-14 h-14 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Open Chat"
      >
        <MessageCircle className="w-7 h-7 text-primary-foreground" />
      </Link>
    </div>
  );
}