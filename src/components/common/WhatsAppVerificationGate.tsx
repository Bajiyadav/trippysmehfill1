import React, { useState } from 'react';
import { MessageSquare, ShieldCheck, CheckCircle2, Lock, LogOut, Phone, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface WhatsAppVerificationGateProps {
  onVerified?: () => void;
}

export const WhatsAppVerificationGate: React.FC<WhatsAppVerificationGateProps> = ({ onVerified }) => {
  const { user, updateProfile, signOut } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  if (!user || user.role !== 'customer' || user.is_whatsapp_verified) {
    return null;
  }

  const restaurantWhatsAppNumber = '919876543210';
  const textMessage = `Hi Trippy's Mehfill Kitchen, please verify my account for food ordering.\nName: ${user.full_name}\nEmail: ${user.email}\nPhone: ${user.phone}`;
  const whatsappUrl = `https://wa.me/${restaurantWhatsAppNumber}?text=${encodeURIComponent(textMessage)}`;

  const handleSelfVerifySubmit = async () => {
    setIsUpdating(true);
    await updateProfile({
      is_whatsapp_verified: true,
      account_status: 'active',
      is_approved: true
    });
    setIsUpdating(false);
    if (onVerified) onVerified();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 text-gray-200">
      <div className="bg-[#121212] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative overflow-hidden">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500" />

        {/* Title */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-serif tracking-wide">
            Verify Your Mobile Number
          </h2>
          <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
            To safeguard our Hyderabad Cloud Kitchen against fraudulent orders, customer mobile verification via WhatsApp is required.
          </p>
        </div>

        {/* Account Info Badge */}
        <div className="p-4 bg-[#181818] border border-white/10 rounded-2xl text-xs space-y-2 font-sans">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium">Customer Name:</span>
            <span className="text-white font-bold">{user.full_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium">Email Address:</span>
            <span className="text-emerald-400 font-mono font-bold">{user.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium">Registered Phone:</span>
            <span className="text-white font-mono font-bold flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-400" /> {user.phone || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/10 text-[11px]">
            <span className="text-gray-400 font-medium">WhatsApp Status:</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Pending Verification
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          
          {/* WhatsApp Deep Link Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMsgSent(true)}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2.5 text-xs sm:text-sm group"
          >
            <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Open WhatsApp & Send Verification Text</span>
          </a>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleSelfVerifySubmit}
            disabled={isUpdating}
            className="w-full py-3 bg-[#1c1c1c] hover:bg-[#252525] border border-emerald-500/40 text-emerald-400 font-bold rounded-2xl transition text-xs flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{msgSent ? "I've Sent the WhatsApp Message - Unlock Ordering" : "Complete Instant Verification"}</span>
          </button>

          {/* Sign Out Fallback */}
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full py-2 text-xs text-gray-500 hover:text-rose-400 transition flex items-center justify-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out & Use Another Account</span>
          </button>
        </div>

        <div className="text-[10px] text-center text-gray-500 flex items-center justify-center gap-1 font-mono pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Trippy's Anti-Fraud Security Gate • Free WhatsApp Verification</span>
        </div>

      </div>
    </div>
  );
};
