import React from 'react';
import { useCart } from '../../context/CartContext';
import { AlertTriangle } from 'lucide-react';

export const NotificationBanner: React.FC = () => {
  const { settings } = useCart();

  if (settings.is_open) return null;

  return (
    <div className="bg-rose-950/80 text-rose-200 border-b border-rose-800/50 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-md">
      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
      <span>{settings.closed_banner_message || "RESTAURANT IS CURRENTLY CLOSED"}</span>
    </div>
  );
};
