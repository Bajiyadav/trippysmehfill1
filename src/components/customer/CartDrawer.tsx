import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { X, Trash2, Plus, Minus, MapPin, QrCode, CreditCard, DollarSign, CheckCircle2 } from 'lucide-react';
import { Order, PaymentMethod } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { playKitchenAlertSound } from '../../lib/sound';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  existingOrders?: Order[];
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onOrderSuccess, existingOrders = [] }) => {
  const { cart, updateQuantity, removeFromCart, clearCart, subtotal, deliveryFee, taxAmount, grandTotal, settings } = useCart();
  const { user } = useAuth();

  const [deliveryAddress, setDeliveryAddress] = useState(user?.hostel_address || 'Main Campus Hostel, Block B Room 204');
  const [landmark, setLandmark] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [upiTxnId, setUpiTxnId] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isMinOrderMet = subtotal >= settings.min_order_value;

  const handlePlaceOrder = async () => {
    setErrorMsg('');

    if (!user) {
      setErrorMsg('Please sign in to place an order.');
      return;
    }

    if (!deliveryAddress) {
      setErrorMsg('Please enter your hostel / delivery address.');
      return;
    }

    if (!isMinOrderMet) {
      setErrorMsg(`Minimum order value is ₹${settings.min_order_value}. Please add items worth ₹${settings.min_order_value - subtotal} more.`);
      return;
    }

    if (paymentMethod === 'UPI' && !upiTxnId) {
      setErrorMsg('Please enter the 12-digit UPI transaction reference ID after paying.');
      return;
    }

    setIsPlacing(true);

    // Compute next strictly sequential order number (#1001, #1002, #1003, #1004, #1005...)
    const orderNums = existingOrders.map(o => {
      const match = o.order_number?.match(/\d+/);
      return match ? parseInt(match[0], 10) : 1000;
    });
    const maxNum = orderNums.length > 0 ? Math.max(...orderNums) : 1000;
    const nextSeq = Math.max(maxNum + 1, 1005);
    const newOrderNumber = `#${nextSeq}`;

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      order_number: newOrderNumber,
      customer_id: user.id,
      customer_name: user.full_name,
      customer_phone: user.phone || '6301196547',
      delivery_address: deliveryAddress,
      landmark,
      items: cart.map(c => ({
        dish_id: c.menuItem.id,
        dish_name: c.menuItem.name,
        quantity: c.quantity,
        price: c.menuItem.price,
        is_veg: c.menuItem.is_veg
      })),
      subtotal,
      tax_amount: taxAmount,
      delivery_fee: deliveryFee,
      total_amount: grandTotal,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'UPI' ? 'completed' : 'pending',
      upi_transaction_id: upiTxnId,
      status: 'pending',
      created_at: new Date().toLocaleString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('orders').insert([newOrder]);
      } catch (err) {
        console.error('Failed to sync order to Supabase:', err);
      }
    }

    // Play kitchen chime notification sound
    playKitchenAlertSound();

    setIsPlacing(false);
    clearCart();
    onClose();
    onOrderSuccess(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md">
      <div className="bg-[#121212] text-gray-200 w-full max-w-lg h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-white/10">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0d0d0d]">
          <div>
            <h2 className="text-lg font-bold text-white font-serif tracking-wide">Your Shopping Cart</h2>
            <p className="text-xs text-gray-400">Trippy's Mehfill • {cart.length} items</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {cart.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#181818] text-[#C5A059] border border-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8" />
              </div>
              <p className="text-gray-200 font-bold">Your cart is empty</p>
              <p className="text-xs text-gray-500 mt-1">Explore our delicious Hyderabadi biryanis & dosas to add items.</p>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Items</h3>
                {cart.map((item) => (
                  <div
                    key={item.menuItem.id}
                    className="flex items-center justify-between p-3 bg-[#181818] rounded-xl border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.menuItem.is_veg ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{item.menuItem.name}</h4>
                        <span className="text-xs text-gray-400 font-medium">₹{item.menuItem.price} x {item.quantity}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-[#121212] border border-white/10 rounded-lg px-1.5 py-1 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, -1)}
                          className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-[#C5A059] px-1">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, 1)}
                          className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-white min-w-[50px] text-right">
                        ₹{item.menuItem.price * item.quantity}
                      </span>

                      <button
                        onClick={() => removeFromCart(item.menuItem.id)}
                        className="text-gray-500 hover:text-rose-400 transition p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Address */}
              <div className="pt-2 border-t border-white/10">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery Location</h3>
                <div className="space-y-2">
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#C5A059] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Hostel / Room No / Building Address"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs font-medium text-white placeholder-gray-500 focus:border-[#C5A059] outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Landmark (e.g. Gate 5, Block C)"
                    className="w-full px-3 py-2 bg-[#181818] border border-white/10 rounded-xl text-xs font-medium text-white placeholder-gray-500 focus:border-[#C5A059] outline-none"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="pt-2 border-t border-white/10">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Method</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('COD')}
                    className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center gap-2 transition ${
                      paymentMethod === 'COD'
                        ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059] shadow-sm'
                        : 'border-white/10 bg-[#181818] text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-[#C5A059]" />
                    <span>Cash on Delivery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center gap-2 transition ${
                      paymentMethod === 'UPI'
                        ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059] shadow-sm'
                        : 'border-white/10 bg-[#181818] text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-[#C5A059]" />
                    <span>Instant UPI QR</span>
                  </button>
                </div>

                {/* UPI QR Display */}
                {paymentMethod === 'UPI' && (
                  <div className="mt-3 p-3 bg-[#181818] rounded-xl border border-white/10 text-center">
                    <p className="text-xs font-bold text-[#C5A059] mb-2">
                      Scan & Pay ₹{grandTotal} to UPI ID:
                    </p>
                    <div className="bg-white p-2 rounded-lg inline-block border border-white/20 shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=${settings.restaurant_upi_id}&pn=TrippysMehfill&am=${grandTotal}&cu=INR`}
                        alt="UPI Payment QR Code"
                        className="w-32 h-32 mx-auto"
                      />
                    </div>
                    <p className="text-[11px] font-mono text-[#C5A059] font-bold mt-1">
                      {settings.restaurant_upi_id}
                    </p>
                    <div className="mt-2 text-left">
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">
                        Enter UPI Transaction Reference No:
                      </label>
                      <input
                        type="text"
                        value={upiTxnId}
                        onChange={(e) => setUpiTxnId(e.target.value)}
                        placeholder="12-digit Ref No. (e.g. 423981290312)"
                        className="w-full px-3 py-1.5 bg-[#121212] border border-white/10 rounded-lg text-xs font-mono text-white outline-none focus:border-[#C5A059]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary Calculations */}
              <div className="pt-3 border-t border-white/10 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-400">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-white">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Delivery Charge</span>
                  <span className="font-bold">
                    {deliveryFee === 0 ? <span className="text-emerald-400 font-extrabold uppercase">FREE</span> : `₹${deliveryFee}`}
                  </span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>GST ({settings.tax_percent}%)</span>
                    <span className="font-bold text-white">₹{taxAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
                  <span>Grand Total</span>
                  <span className="text-[#C5A059] text-base">₹{grandTotal}</span>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer Checkout Button */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-[#0d0d0d]">
            {!isMinOrderMet && (
              <p className="text-[11px] text-[#C5A059] font-semibold mb-2 text-center bg-[#181818] p-1.5 rounded-lg border border-white/10">
                Add ₹{settings.min_order_value - subtotal} more to reach minimum order value of ₹{settings.min_order_value}
              </p>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={isPlacing || !isMinOrderMet}
              className="w-full py-3.5 bg-[#C5A059] hover:bg-[#b38f48] active:scale-[0.99] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 flex items-center justify-center gap-2 transition text-sm disabled:opacity-50"
            >
              {isPlacing ? (
                <span>Processing Order...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Place Order • ₹{grandTotal}</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
