import React from 'react';
import { X, Clock, Utensils, Lock } from 'lucide-react';
import { KitchenSettings } from '../../types';

interface ClosedRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: KitchenSettings;
}

export const ClosedRestaurantModal: React.FC<ClosedRestaurantModalProps> = ({
  isOpen,
  onClose,
  settings
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#121212] border border-rose-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-center relative text-gray-100">
        
        {/* Close Icon Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
          title="Browse Menu Only"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Closed Icon Header */}
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
          <Lock className="w-8 h-8" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black uppercase tracking-wider">
            <span>🔴 RESTAURANT IS CURRENTLY CLOSED</span>
          </div>
          <h2 className="text-2xl font-black font-serif text-white">We are currently not accepting orders.</h2>
          <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
            {settings.closed_banner_message || 'Please visit us again during business hours.'}
          </p>
        </div>

        {/* Operating Hours Box */}
        <div className="bg-[#181818] p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center justify-center gap-2 text-[#C5A059] font-bold text-xs">
            <Clock className="w-4 h-4" />
            <span>Kitchen Operating Hours</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
            <div className="bg-[#0d0d0d] p-3 rounded-xl border border-white/5 space-y-0.5">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Opening Time</span>
              <span className="text-emerald-400 font-black text-sm">{settings.opening_time || '09:00 AM'}</span>
            </div>

            <div className="bg-[#0d0d0d] p-3 rounded-xl border border-white/5 space-y-0.5">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Closing Time</span>
              <span className="text-rose-400 font-black text-sm">{settings.closing_time || '10:00 PM'}</span>
            </div>
          </div>
        </div>

        {/* Browse Menu Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold text-xs rounded-2xl shadow-lg shadow-[#C5A059]/20 transition flex items-center justify-center gap-2"
        >
          <Utensils className="w-4 h-4" />
          <span>Browse Menu Only</span>
        </button>

      </div>
    </div>
  );
};
