import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem, KitchenSettings } from '../types';
import { initialKitchenSettings } from '../lib/initialData';
import { settingsService } from '../services/supabase/settings';

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
  refreshSettings: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<KitchenSettings>(initialKitchenSettings);

  const refreshSettings = async () => {
    try {
      const liveSettings = await settingsService.fetchKitchenSettings();
      setSettings(liveSettings);
    } catch (err) {
      console.error('Failed to load kitchen settings from Supabase:', err);
    }
  };

  useEffect(() => {
    refreshSettings();
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
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await settingsService.updateKitchenSettings(updated);
    } catch (err) {
      console.error('Failed to persist kitchen settings in Supabase:', err);
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
        updateSettings,
        refreshSettings,
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
