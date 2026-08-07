import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem, KitchenSettings } from '../types';
import { initialKitchenSettings } from '../lib/initialData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  grandTotal: number;
  settings: KitchenSettings;
  updateSettings: (newSettings: Partial<KitchenSettings>) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('trippys_cart');
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });

  const [settings, setSettings] = useState<KitchenSettings>(() => {
    const saved = localStorage.getItem('trippys_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch { return initialKitchenSettings; }
    }
    return initialKitchenSettings;
  });

  useEffect(() => {
    localStorage.setItem('trippys_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('trippys_settings', JSON.stringify(settings));
  }, [settings]);

  // Load latest global restaurant settings from Supabase & subscribe to Realtime updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    async function loadKitchenSettings() {
      try {
        const { data, error } = await supabase
          .from('kitchen_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (!error && data) {
          console.log('[CartContext] Loaded global kitchen settings from Supabase:', data);
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('[CartContext] Error loading kitchen settings:', err);
      }
    }

    loadKitchenSettings();

    // Supabase Realtime channel for global settings sync
    const channel = supabase
      .channel('public:kitchen_settings:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitchen_settings' },
        (payload) => {
          console.log('[Realtime Settings] Global setting update received:', payload);
          if (payload.new) {
            const updated = payload.new as KitchenSettings;
            setSettings(prev => ({ ...prev, ...updated }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addToCart = (menuItem: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.menuItem.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.menuItem.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => setCart([]);

  const updateSettings = async (newSettings: Partial<KitchenSettings>) => {
    const merged = { ...settings, ...newSettings, id: 1 };
    setSettings(merged);
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('kitchen_settings')
          .upsert([merged]);

        if (error) {
          console.error('[CartContext] Failed to upsert kitchen_settings to Supabase:', error.message);
        }
      } catch (err) {
        console.error('[CartContext] Error upserting kitchen settings:', err);
      }
    }
  };

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const deliveryFee = subtotal >= settings.free_delivery_above || subtotal === 0
    ? 0
    : settings.delivery_charge;

  const taxAmount = Math.round((subtotal * settings.tax_percent) / 100);
  const grandTotal = subtotal + deliveryFee + taxAmount;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCount,
        subtotal,
        deliveryFee,
        taxAmount,
        grandTotal,
        settings,
        updateSettings
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
