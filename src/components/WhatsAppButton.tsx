import { MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  className?: string;
}

export default function WhatsAppButton({ phoneNumber = '+923095870359', className }: WhatsAppButtonProps) {
  const handleClick = () => {
    // Remove any non-numeric characters from the phone number except the leading +
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#25D366]/50",
        className
      )}
      aria-label="Contact Support on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </button>
  );
}
