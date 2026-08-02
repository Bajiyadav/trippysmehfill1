import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ShoppingBag, User, LogOut, Shield, ChefHat, Bike, Compass } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { UserRole } from '../../types';

interface HeaderProps {
  activeSection: 'menu' | 'track' | 'admin' | 'kitchen' | 'driver';
  setActiveSection: (sec: 'menu' | 'track' | 'admin' | 'kitchen' | 'driver') => void;
  onOpenCart: () => void;
  onOpenOrders: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  setActiveSection,
  onOpenCart,
  onOpenOrders
}) => {
  const { user, signOut, switchDemoRole } = useAuth();
  const { totalCount } = useCart();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);

  return (
    <>
      {/* Top Banner Tag */}
      <header className="bg-[#0d0d0d]/95 backdrop-blur-md text-white sticky top-0 z-40 shadow-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo & Brand Name */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setActiveSection('menu')}
            >
              <div className="w-12 h-12 rounded-full bg-[#181818] border-2 border-[#C5A059] flex items-center justify-center p-1.5 shadow-lg group-hover:scale-105 transition-transform">
                <div className="text-center leading-none">
                  <div className="text-[9px] font-extrabold text-[#C5A059] tracking-wider">TRIPPY'S</div>
                  <div className="text-[8px] font-semibold text-gray-300">MEHFILL</div>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-[#C5A059] tracking-widest uppercase">
                  HYDERABAD'S CLOUD KITCHEN
                </span>
                <span className="text-xl font-black tracking-tight text-white font-serif">
                  Trippy's Mehfill
                </span>
              </div>
            </div>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <button
                onClick={() => setActiveSection('menu')}
                className={`transition-colors py-1 ${
                  activeSection === 'menu' ? 'text-[#C5A059] font-bold border-b-2 border-[#C5A059]' : 'text-gray-300 hover:text-white'
                }`}
              >
                Menu
              </button>

              <button
                onClick={onOpenOrders}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Track order
              </button>

              {user?.role === 'customer' && (
                <button
                  onClick={onOpenOrders}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Order History
                </button>
              )}

              {(user?.role === 'admin' || user?.role === 'staff') && (
                <button
                  onClick={() => setActiveSection('admin')}
                  className={`flex items-center gap-1.5 py-1 transition-colors ${
                    activeSection === 'admin' ? 'text-[#C5A059] font-bold border-b-2 border-[#C5A059]' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4 text-[#C5A059]" />
                  <span>Dashboard</span>
                </button>
              )}

              {user?.role === 'driver' && (
                <button
                  onClick={() => setActiveSection('driver')}
                  className={`flex items-center gap-1.5 py-1 transition-colors ${
                    activeSection === 'driver' ? 'text-[#C5A059] font-bold border-b-2 border-[#C5A059]' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Bike className="w-4 h-4 text-[#C5A059]" />
                  <span>Driver Portal</span>
                </button>
              )}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-3 sm:gap-4">
              
              {/* Demo Role Switcher Pill */}
              <div className="hidden lg:flex items-center bg-[#181818] p-1 rounded-full border border-white/10 text-xs">
                <span className="px-2 text-[#C5A059] font-semibold text-[10px] uppercase tracking-wider">Role:</span>
                {(['customer', 'admin', 'staff', 'driver'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchDemoRole(r);
                      if (r === 'admin' || r === 'staff') setActiveSection('admin');
                      else if (r === 'driver') setActiveSection('driver');
                      else setActiveSection('menu');
                    }}
                    className={`px-2.5 py-1 rounded-full font-medium capitalize transition ${
                      user?.role === r
                        ? 'bg-[#C5A059] text-black font-extrabold shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Cart Button */}
              <button
                onClick={onOpenCart}
                className="relative p-2.5 bg-[#181818] hover:bg-white/10 text-white rounded-xl border border-[#C5A059]/30 transition-all flex items-center gap-2"
              >
                <ShoppingBag className="w-5 h-5 text-[#C5A059]" />
                <span className="hidden sm:inline text-xs font-bold">Cart</span>
                {totalCount > 0 && (
                  <span className="bg-[#C5A059] text-black text-xs font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {totalCount}
                  </span>
                )}
              </button>

              {/* Auth Button or User Menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsMenuDropdownOpen(!isMenuDropdownOpen)}
                    className="flex items-center gap-2 bg-[#181818] hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-gray-200"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#C5A059] text-black flex items-center justify-center font-bold text-xs uppercase">
                      {user.full_name.charAt(0)}
                    </div>
                    <span className="max-w-[100px] truncate">{user.full_name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#C5A059]/20 text-[#C5A059] font-bold uppercase border border-[#C5A059]/30">
                      {user.role}
                    </span>
                  </button>

                  {isMenuDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#121212] text-gray-200 rounded-2xl shadow-2xl border border-white/10 py-2 z-50 text-sm">
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="font-bold text-white truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>

                      {user.role === 'admin' && (
                        <button
                          onClick={() => { setActiveSection('admin'); setIsMenuDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 text-[#C5A059] font-medium flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" /> Admin ERP
                        </button>
                      )}

                      {user.role === 'driver' && (
                        <button
                          onClick={() => { setActiveSection('driver'); setIsMenuDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 text-[#C5A059] font-medium flex items-center gap-2"
                        >
                          <Bike className="w-4 h-4" /> Driver Portal
                        </button>
                      )}

                      <button
                        onClick={onOpenOrders}
                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-300 font-medium flex items-center gap-2"
                      >
                        <Compass className="w-4 h-4" /> Track Orders
                      </button>

                      <button
                        onClick={() => { signOut(); setIsMenuDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-rose-500/10 text-rose-400 font-medium flex items-center gap-2 border-t border-white/10 mt-1"
                      >
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </>
  );
};
