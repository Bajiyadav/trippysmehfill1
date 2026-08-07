import React, { useMemo, useState } from 'react';
import {
  MapPin, QrCode, Wallet, CheckCircle2, AlertCircle, Loader2, ArrowLeft,
  Clock, Copy, Check, ShoppingBag, User, Phone, Truck
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Order, PaymentMethod } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ordersService } from '../../services/supabase';
import { playKitchenAlertSound } from '../../lib/sound';
import { captureFullSecurityContext } from '../../lib/geoUtils';
import {
  validateCheckout, nextOrderNumber, estimatedDeliveryLabel, buildUpiPaymentUri
} from '../../lib/checkout';

interface CheckoutViewProps {
  existingOrders: Order[];
  onOrderPlaced: (order: Order) => void;
  onTrackOrder: (order: Order) => void;
  onBackToMenu: () => void;
}

/** UPI settlement is a claim by the customer until someone confirms the transfer. */
type UpiState = 'unpaid' | 'pending' | 'claimed';

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  existingOrders,
  onOrderPlaced,
  onTrackOrder,
  onBackToMenu
}) => {
  const { cart, subtotal, deliveryFee, taxAmount, grandTotal, settings, clearCart } = useCart();
  const { user } = useAuth();

  // Seeded from the signed-in customer's own saved profile -- their data, not a
  // sample -- and editable, because the delivery address often is not home.
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.hostel_address ?? '');
  const [landmark, setLandmark] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [upiState, setUpiState] = useState<UpiState>('unpaid');
  const [upiTxnId, setUpiTxnId] = useState('');
  const [copied, setCopied] = useState(false);

  const [isPlacing, setIsPlacing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placedAt, setPlacedAt] = useState<Date | null>(null);

  const PHONE_LENGTH = 10;
  const toPhoneDigits = (raw: string) => raw.replace(/\D/g, '').slice(0, PHONE_LENGTH);

  const validation = useMemo(
    () => validateCheckout({
      fullName,
      phone,
      address,
      paymentMethod,
      cartCount: cart.length,
      subtotal,
      minOrderValue: settings.min_order_value
    }),
    [fullName, phone, address, paymentMethod, cart.length, subtotal, settings.min_order_value]
  );

  const orderNumber = useMemo(
    () => nextOrderNumber(existingOrders.map(o => o.order_number)),
    [existingOrders]
  );

  const upiUri = buildUpiPaymentUri({
    upiId: settings.restaurant_upi_id,
    payeeName: settings.kitchen_name,
    amount: grandTotal,
    orderNumber
  });

  const handleCopyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(settings.restaurant_upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked -- the id is displayed in full, so nothing is lost.
    }
  };

  const handlePlaceOrder = async () => {
    setErrorMsg('');

    if (!user) {
      setErrorMsg('Please sign in to place your order.');
      return;
    }

    if (!validation.valid) {
      setErrorMsg(validation.message);
      return;
    }

    // Without a configured backend there is nowhere to save the order. Saying so
    // is the only honest option -- a confirmation screen here would be a lie.
    if (!isSupabaseConfigured) {
      setErrorMsg('Ordering is unavailable right now: the kitchen database is not reachable. Please try again later.');
      return;
    }

    setIsPlacing(true);

    let securityContext: Awaited<ReturnType<typeof captureFullSecurityContext>> | null = null;
    try {
      securityContext = await captureFullSecurityContext();
    } catch {
      // Telemetry is best-effort; a blocked GPS prompt must not block ordering.
    }

    const draft: Omit<Order, 'id' | 'created_at'> = {
      order_number: orderNumber,
      customer_id: user.id,
      customer_name: fullName.trim(),
      customer_phone: phone.trim(),
      delivery_address: address.trim(),
      landmark: landmark.trim() || undefined,
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
      payment_method: paymentMethod as PaymentMethod,
      // Both methods start unpaid. COD settles on handover; UPI settles when the
      // transfer is confirmed. Neither is 'completed' at the moment of ordering.
      payment_status: 'pending',
      upi_transaction_id: paymentMethod === 'UPI' ? upiTxnId.trim() || undefined : undefined,
      status: 'pending',
      customer_ip: securityContext?.ipAddress,
      order_latitude: securityContext?.latitude,
      order_longitude: securityContext?.longitude,
      gps_accuracy: securityContext?.accuracyMeters,
      gps_allowed: securityContext?.gpsAllowed,
      distance_km: securityContext?.distanceKm,
      device_type: securityContext?.deviceType,
      os_name: securityContext?.osName,
      browser_name: securityContext?.browserName,
      city: securityContext?.city,
      state: securityContext?.state,
      pin_code: securityContext?.pinCode,
      google_maps_url: securityContext?.googleMapsUrl,
      fraud_risk_level: securityContext?.fraudRiskLevel,
      fraud_risk_reasons: securityContext?.fraudRiskReasons
    };

    try {
      // The order exists only once this resolves. Everything after it -- the
      // chime, the cleared cart, the confirmation -- is downstream of a real row.
      const created = await ordersService.createOrder(draft);

      playKitchenAlertSound();
      setPlacedOrder(created);
      setPlacedAt(new Date());
      if (paymentMethod === 'UPI') setUpiState('pending');
      clearCart();
      onOrderPlaced(created);
    } catch (err: any) {
      setErrorMsg(
        `We could not place your order: ${err?.message || 'the kitchen database rejected it'}. ` +
        'Nothing has been charged and your cart is intact -- please try again.'
      );
    } finally {
      setIsPlacing(false);
    }
  };

  const handleClaimUpiPayment = async () => {
    if (!placedOrder) return;
    setErrorMsg('');

    try {
      // Recorded as still pending: the kitchen confirms the transfer landed.
      // Marking it completed here would be asserting a settlement nobody checked.
      await ordersService.updatePaymentStatus(placedOrder.id, 'pending', upiTxnId.trim() || undefined);
      setUpiState('claimed');
    } catch (err: any) {
      setErrorMsg(`We could not record your payment: ${err?.message || 'database error'}. Please try again.`);
    }
  };

  // ---------------------------------------------------------------- confirmed

  if (placedOrder) {
    const eta = estimatedDeliveryLabel(placedAt ?? new Date(), settings.estimated_delivery_mins);

    return (
      <main className="flex-1 px-4 py-10">
        <div className="max-w-xl mx-auto space-y-5">
          <div className="bg-[#121212] border border-emerald-500/30 rounded-3xl p-7 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-white font-serif">Order Confirmed</h1>
              <p className="text-xs text-gray-400">Your order is with the kitchen.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
              <div className="p-3.5 bg-[#181818] border border-white/10 rounded-2xl">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Order ID</p>
                <p className="text-sm font-black text-[#C5A059] font-mono mt-0.5">{placedOrder.order_number}</p>
                <p className="text-[10px] text-gray-500 font-mono mt-1 break-all">{placedOrder.id}</p>
              </div>
              <div className="p-3.5 bg-[#181818] border border-white/10 rounded-2xl">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Estimated Delivery</p>
                <p className="text-sm font-black text-white mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C5A059]" /> {eta}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#181818] border border-white/10 rounded-2xl text-left">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Amount</p>
              <p className="text-lg font-black text-white mt-0.5">₹{placedOrder.total_amount}</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {placedOrder.payment_method === 'COD'
                  ? 'Pay cash when your order arrives.'
                  : 'Paid by UPI — confirmed by the kitchen before dispatch.'}
              </p>
            </div>

            {/* UPI settlement, after the order already exists */}
            {placedOrder.payment_method === 'UPI' && (
              <div className="p-4 bg-[#181818] border border-white/10 rounded-2xl space-y-3">
                {upiState === 'claimed' ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-black text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Payment Success
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Your reference has been sent to the kitchen. They will confirm the transfer before dispatch.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-black text-amber-400 flex items-center justify-center gap-1.5">
                      <Clock className="w-4 h-4" /> Payment Pending
                    </p>
                    <div className="bg-white p-2.5 rounded-2xl inline-block">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`}
                        alt={`UPI QR code to pay ₹${grandTotal}`}
                        className="w-36 h-36"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-xs text-white bg-[#121212] py-1.5 px-2.5 rounded-lg border border-[#C5A059]/30 font-mono">
                        {settings.restaurant_upi_id}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUpiId}
                        aria-label="Copy UPI ID"
                        className="p-1.5 rounded-lg bg-[#121212] border border-white/10 text-gray-400 hover:text-white transition"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={upiTxnId}
                      onChange={(e) => setUpiTxnId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="UPI transaction reference"
                      className="w-full px-3 py-2 bg-[#121212] border border-white/10 rounded-xl text-xs font-mono text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
                    />
                    <button
                      type="button"
                      onClick={handleClaimUpiPayment}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition text-xs"
                    >
                      I've Paid
                    </button>
                  </>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onTrackOrder(placedOrder)}
                className="py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-xl transition text-xs flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" /> Track Order
              </button>
              <button
                type="button"
                onClick={onBackToMenu}
                className="py-3 bg-[#181818] border border-white/10 hover:bg-white/5 text-gray-300 font-bold rounded-xl transition text-xs"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ----------------------------------------------------------------- checkout

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToMenu}
            aria-label="Back to menu"
            className="p-2 rounded-xl bg-[#181818] border border-white/10 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white font-serif tracking-tight">Checkout</h1>
            <p className="text-[11px] text-gray-400">Confirm your details and choose how you'd like to pay.</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="bg-[#121212] border border-white/10 rounded-3xl p-10 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-[#C5A059] mx-auto" />
            <p className="text-sm font-bold text-white">Your cart is empty</p>
            <p className="text-xs text-gray-400">Add something from the menu to get started.</p>
            <button
              type="button"
              onClick={onBackToMenu}
              className="mt-1 px-5 py-2.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-xl transition text-xs"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Delivery details */}
            <section className="bg-[#121212] border border-white/10 rounded-3xl p-5 space-y-3.5">
              <h2 className="text-sm font-black text-white font-serif">Delivery Details</h2>

              <div>
                <label htmlFor="co-name" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="co-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="co-phone" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="co-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={PHONE_LENGTH}
                    value={phone}
                    onChange={(e) => setPhone(toPhoneDigits(e.target.value))}
                    placeholder="10-digit mobile number"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="co-address" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Delivery Address *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    id="co-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your delivery address"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Landmark (optional)"
                aria-label="Landmark (optional)"
                className="w-full px-3 py-2 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
              />
            </section>

            {/* Payment */}
            <section className="bg-[#121212] border border-white/10 rounded-3xl p-5 space-y-3">
              <h2 className="text-sm font-black text-white font-serif">Payment Method</h2>

              <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'COD'}
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    paymentMethod === 'COD'
                      ? 'border-[#C5A059] bg-[#C5A059]/10'
                      : 'border-white/10 bg-[#181818] hover:bg-white/5'
                  }`}
                >
                  <Wallet className={`w-5 h-5 mb-1.5 ${paymentMethod === 'COD' ? 'text-[#C5A059]' : 'text-gray-400'}`} />
                  <p className={`text-xs font-black ${paymentMethod === 'COD' ? 'text-[#C5A059]' : 'text-white'}`}>
                    Cash on Delivery
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Pay the rider when it arrives.</p>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'UPI'}
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    paymentMethod === 'UPI'
                      ? 'border-[#C5A059] bg-[#C5A059]/10'
                      : 'border-white/10 bg-[#181818] hover:bg-white/5'
                  }`}
                >
                  <QrCode className={`w-5 h-5 mb-1.5 ${paymentMethod === 'UPI' ? 'text-[#C5A059]' : 'text-gray-400'}`} />
                  <p className={`text-xs font-black ${paymentMethod === 'UPI' ? 'text-[#C5A059]' : 'text-white'}`}>
                    UPI QR Payment
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Scan and pay after placing the order.</p>
                </button>
              </div>

              {paymentMethod === 'UPI' && (
                <p className="text-[11px] text-gray-400 bg-[#181818] border border-white/10 rounded-xl p-3">
                  The QR code and UPI ID appear on the next screen, once your order is saved — so you never
                  pay for an order that failed to reach the kitchen.
                </p>
              )}
            </section>

            {/* Bill */}
            <section className="bg-[#121212] border border-white/10 rounded-3xl p-5 space-y-2 text-xs">
              <h2 className="text-sm font-black text-white font-serif mb-1">
                Order Summary ({cart.reduce((s, i) => s + i.quantity, 0)} items)
              </h2>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.menuItem.id} className="flex justify-between gap-3 text-gray-300">
                    <span className="truncate">
                      {item.menuItem.name} <span className="text-gray-500">× {item.quantity}</span>
                    </span>
                    <span className="font-bold text-white shrink-0">₹{item.menuItem.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/10 space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span><span className="font-bold text-white">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Delivery</span>
                  <span className="font-bold">
                    {deliveryFee === 0 ? <span className="text-emerald-400 font-black uppercase">Free</span> : `₹${deliveryFee}`}
                  </span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>GST ({settings.tax_percent}%)</span><span className="font-bold text-white">₹{taxAmount}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/10 text-sm font-black text-white">
                  <span>Total</span><span className="text-[#C5A059] text-base">₹{grandTotal}</span>
                </div>
              </div>
            </section>

            {!validation.valid && (
              <p className="text-[11px] text-[#C5A059] text-center">{validation.message}</p>
            )}

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isPlacing || !validation.valid}
              className="w-full py-3.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-2xl shadow-lg shadow-[#C5A059]/20 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlacing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Placing your order…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Place Order • ₹{grandTotal}</>
              )}
            </button>
          </>
        )}
      </div>
    </main>
  );
};
