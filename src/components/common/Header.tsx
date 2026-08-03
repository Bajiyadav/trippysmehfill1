import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ShoppingBag, User, LogOut, Shield, Bike, HelpCircle, Sparkles } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { SupportModal } from './SupportModal';
import { UserRole } from '../../types';

interface HeaderProps {
  activeSection: 'menu' | 'track' | 'admin' | 'kitchen' | 'driver';
  setActiveSection: (sec: 'menu' | 'track' | 'admin' | 'kitchen' | 'driver') => void;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onLogoClick?: () => void;
  onOpenAuth?: (tab?: 'signin' | 'register') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  setActiveSection,
  onOpenCart,
  onOpenOrders,
  onLogoClick,
  onOpenAuth
}) => {
  const { user, signOut, switchDemoRole } = useAuth();
  const { totalCount } = useCart();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'register'>('signin');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      setActiveSection('menu');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSignInClick = (tab: 'signin' | 'register' = 'signin') => {
    if (onOpenAuth) {
      onOpenAuth(tab);
    } else {
      setAuthDefaultTab(tab);
      setIsAuthOpen(true);
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSection('menu');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <>
      <header className="bg-[#0d0d0d]/95 backdrop-blur-md text-white sticky top-0 z-40 shadow-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo & Brand Title */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={handleLogoClick}
            >
              <div className="w-11 h-11 rounded-2xl bg-[#181818] border-2 border-[#C5A059] flex items-center justify-center p-1.5 shadow-lg group-hover:scale-105 transition-transform">
                <div className="text-center leading-none">
                  <div className="text-[9px] font-black text-[#C5A059] tracking-wider">TRIPPY'S</div>
                  <div className="text-[8px] font-bold text-gray-300">MEHFIL</div>
                </div>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-[#C5A059] tracking-widest uppercase">
                  CLOUD KITCHEN ERP
                </span>
                <span className="text-lg sm:text-xl font-black tracking-tight text-white font-serif">
                  Trippy's Mehfill
                </span>
              </div>
            </div>

            {/* Navigation Bar Links (Gallery, Offers, Menu, Support) */}
            <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-extrabold tracking-wide">
              <button
                onClick={() => scrollToSection('gallery-section')}
                className="text-gray-300 hover:text-[#C5A059] transition-colors py-1"
              >
                Gallery
              </button>

              <button
                onClick={() => scrollToSection('offers-section')}
                className="text-gray-300 hover:text-[#C5A059] transition-colors py-1"
              >
                Offers
              </button>

              <button
                onClick={() => scrollToSection('menu-section')}
                className={`transition-colors py-1 ${
                  activeSection === 'menu' ? 'text-[#C5A059] font-black border-b-2 border-[#C5A059]' : 'text-gray-300 hover:text-[#C5A059]'
                }`}
              >
                Menu
              </button>

              <button
                onClick={() => setIsSupportOpen(true)}
                className="text-gray-300 hover:text-[#C5A059] transition-colors py-1 flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Support</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveSection('admin')}
                  className={`flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/40 text-[#C5A059] font-black text-xs transition ${
                    activeSection === 'admin' ? 'bg-[#C5A059] text-black' : 'hover:bg-[#C5A059]/20'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin ERP</span>
                </button>
              )}
            </nav>

            {/* Right Side Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Demo Role Selector Pill */}
              <div className="hidden xl:flex items-center bg-[#181818] p-1 rounded-full border border-white/10 text-xs">
                <span className="px-2 text-[#C5A059] font-bold text-[10px] uppercase tracking-wider">Role:</span>
                {(['customer', 'admin', 'staff', 'driver'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchDemoRole(r);
                      if (r === 'admin') setActiveSection('admin');
                      else if (r === 'driver') setActiveSection('driver');
                      else setActiveSection('menu');
                    }}
                    className={`px-2.5 py-0.5 rounded-full font-bold capitalize transition text-[11px] ${
                      user?.role === r
                        ? 'bg-[#C5A059] text-black font-black shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Shopping Cart Button */}
              <button
                onClick={onOpenCart}
                className="relative p-2.5 bg-[#181818] hover:bg-white/10 text-white rounded-xl border border-[#C5A059]/30 transition flex items-center gap-1.5 shadow-md"
              >
                <ShoppingBag className="w-4 h-4 text-[#C5A059]" />
                <span className="hidden sm:inline text-xs font-bold">Cart</span>
                {totalCount > 0 && (
                  <span className="bg-[#C5A059] text-black text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {totalCount}
                  </span>
                )}
              </button>

              {/* Login & Sign Up Buttons (when unauthenticated) */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsMenuDropdownOpen(!isMenuDropdownOpen)}
                    className="flex items-center gap-2 bg-[#181818] hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-gray-200"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#C5A059] text-black flex items-center justify-center font-black text-xs uppercase">
                      {user.full_name.charAt(0)}
                    </div>
                    <span className="max-w-[100px] truncate">{user.full_name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#C5A059]/20 text-[#C5A059] font-black uppercase border border-[#C5A059]/30">
                      {user.role}
                    </span>
                  </button>

                  {isMenuDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-[#121212] text-gray-200 rounded-2xl shadow-2xl border border-white/15 py-2 z-50 text-xs space-y-1">
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="font-bold text-white truncate">{user.full_name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                      </div>

                      {user.role === 'admin' && (
                        <button
                          onClick={() => { setActiveSection('admin'); setIsMenuDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 text-[#C5A059] font-bold flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" /> Admin ERP
                        </button>
                      )}

                      {user.role === 'driver' && (
                        <button
                          onClick={() => { setActiveSection('driver'); setIsMenuDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 text-[#C5A059] font-bold flex items-center gap-2"
                        >
                          <Bike className="w-4 h-4" /> Driver Portal
                        </button>
                      )}

                      <button
                        onClick={onOpenOrders}
                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-300 font-bold flex items-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" /> Order History
                      </button>

                      <button
                        onClick={() => { setIsSupportOpen(true); setIsMenuDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-300 font-bold flex items-center gap-2"
                      >
                        <HelpCircle className="w-4 h-4" /> Support
                      </button>

                      <button
                        onClick={() => { signOut(); setIsMenuDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-rose-500/10 text-rose-400 font-bold flex items-center gap-2 border-t border-white/10 pt-2"
                      >
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSignInClick('signin')}
                    className="px-3.5 py-2 bg-[#181818] hover:bg-white/10 text-white font-black rounded-xl text-xs border border-white/15 transition shadow-sm"
                  >
                    Login
                  </button>

                  <button
                    onClick={() => handleSignInClick('register')}
                    className="px-4 py-2 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-xl text-xs shadow-lg transition transform active:scale-95"
                  >
                    Sign Up
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Support Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        defaultTab={authDefaultTab}
        onClose={() => setIsAuthOpen(false)}
      />
    </>
  );
};
