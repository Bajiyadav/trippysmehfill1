import React from 'react';
import { MenuItem } from '../../types';
import { useCart } from '../../context/CartContext';
import { Sparkles, Plus, Check, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TodaysSpecialsProps {
  items: MenuItem[];
  onRequireAuth: () => void;
}

export const TodaysSpecials: React.FC<TodaysSpecialsProps> = ({ items, onRequireAuth }) => {
  const { cart, addToCart, settings } = useCart();
  const { user } = useAuth();

  const specials = items.filter(item => item.is_todays_special);

  if (specials.length === 0) return null;

  const handleAddClick = (item: MenuItem) => {
    if (!settings.is_open) {
      alert(`Restaurant is currently closed. Orders will resume at ${settings.opening_time || '09:00 AM'}.`);
      return;
    }
    addToCart(item);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[#C5A059] animate-pulse" />
        <h2 className="text-xl font-extrabold text-white font-serif tracking-tight">
          Today's Specials
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {specials.map((item) => {
          const cartItem = cart.find(c => c.menuItem.id === item.id);
          return (
            <div
              key={item.id}
              className="bg-gradient-to-r from-[#181818] to-gray-900 rounded-2xl p-4 border border-[#C5A059]/30 flex gap-4 items-center shadow-lg relative overflow-hidden group"
            >
              <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-black/40">
                <img
                  src={item.image_url || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#C5A059]/20 text-[#C5A059] text-[10px] font-black px-2 py-0.5 rounded uppercase border border-[#C5A059]/30">
                    SPECIAL
                  </span>
                  <span className={`text-[10px] font-bold ${item.is_veg ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.is_veg ? '● VEG' : '● NON-VEG'}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm truncate mb-1 font-serif">
                  {item.name}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                  {!user ? (
                    <button
                      onClick={onRequireAuth}
                      className="w-full py-1.5 bg-[#C5A059]/10 hover:bg-[#C5A059] text-[#C5A059] hover:text-black font-extrabold rounded-xl text-xs border border-[#C5A059]/40 transition text-center shadow-sm"
                    >
                      Login to Order
                    </button>
                  ) : (
                    <>
                      <div className="text-base font-black text-white">
                        ₹{item.price}
                      </div>

                      {!settings.is_open ? (
                        <button
                          onClick={() => handleAddClick(item)}
                          className="bg-gray-800 text-gray-400 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-white/10 shadow-sm transition hover:bg-gray-700"
                          title={`Restaurant is currently closed. Orders will resume at ${settings.opening_time || '09:00 AM'}.`}
                        >
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                          <span>CLOSED</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddClick(item)}
                          className="bg-[#C5A059] hover:bg-[#b38f48] active:scale-95 text-black font-extrabold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                        >
                          {cartItem ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>In Cart ({cartItem.quantity})</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
