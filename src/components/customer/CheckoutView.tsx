import React, { useMemo, useRef, useState } from 'react';
import {
  MapPin, QrCode, Wallet, CheckCircle2, AlertCircle, Loader2, ArrowLeft,
  Clock, Copy, Check, ShoppingBag, User, Phone, Truck, Smartphone,
  Download, Share2, ImageUp, ReceiptText
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Order, PaymentMethod } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ordersService } from '../../services/supabase';
import { playKitchenAlertSound } from '../../lib/sound';
import { captureFullSecurityContext } from '../../lib/geoUtils';
import {
  validateCheckout, nextOrderNumber, estimatedDeliveryLabel, buildUpiPaymentUri
} from '../../lib/checkout';
import { paymentLabel } from '../../lib/orderStatus';
import { downloadReceiptPdf, shareOrder, sharePaymentScreenshot } from '../../lib/receipt';

interface CheckoutViewProps {
  existingOrders: Order[];
  onOrderPlaced: (order: Order) => void;
  onTrackOrder: (order: Order) => void;
  onBackToMenu: () => void;
}

/** UPI settlement is a claim by the customer until the kitchen confirms it. */
type UpiState = 'pending' | 'claimed';

const PHONE_LENGTH = 10;
const toPhoneDigits = (raw: string) => raw.replace(/\D/g, '').slice(0, PHONE_LENGTH);

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  existingOrders,
  onOrderPlaced,
  onTrackOrder,
  onBackToMenu
}) => {
  const { cart, subtotal, deliveryFee, taxAmount, grandTotal, settings, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Seeded from the signed-in customer's own saved profile -- their data, not a
  // sample -- and editable, because the delivery address often is not home.
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.hostel_address ?? '');
  const [landmark, setLandmark] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [upiState, setUpiState] = useState<UpiState>('pending');
  const [upiTxnId, setUpiTxnId] = useState('');
  const [copied, setCopied] = useState(false);

  const [isPlacing, setIsPlacing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placedAt, setPlacedAt] = useState<Date | null>(null);

  // Guards against a double-tap creating two orders. A ref, not state, because
  // the second tap can arrive in the same tick as the first -- before a state
  // update has rendered and before `isPlacing` would read as true.
  const submitLock = useRef(false);
  const screenshotInput = useRef<HTMLInputElement>(null);

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

  const business = { name: settings.kitchen_name, upiId: settings.restaurant_upi_id };

  const handleCopyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(settings.restaurant_upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      showToast({ title: 'UPI ID copied', tone: 'success', duration: 2500 });
    } catch {
      showToast({
        title: 'Could not copy',
        description: `Use ${settings.restaurant_upi_id} manually.`,
        tone: 'error'
      });
    }
  };

  const handlePlaceOrder = async () => {
    if (submitLock.current) return;
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

    submitLock.current = true;
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
      clearCart();
      onOrderPlaced(created);
      showToast({
        title: 'Order received',
        description: `${created.order_number} has been sent to the kitchen.`,
        tone: 'success',
        key: `order-received-${created.id}`
      });
    } catch (err: any) {
      setErrorMsg(
        `We could not place your order: ${err?.message || 'the kitchen database rejected it'}. ` +
        'Nothing has been charged and your cart is intact — please try again.'
      );
      showToast({ title: 'Order failed', description: 'Nothing was charged.', tone: 'error' });
      // Only released on failure: after success the confirmation screen replaces
      // this form entirely, so there is nothing left to submit twice.
      submitLock.current = false;
    } finally {
      setIsPlacing(false);
    }
  };

  const handleClaimUpiPayment = async () => {
    if (!placedOrder) return;
    setErrorMsg('');

    try {
      // Recorded as still pending: the kitchen confirms the transfer landed.
      // Marking it completed here would assert a settlement nobody checked.
      await ordersService.updatePaymentStatus(placedOrder.id, 'pending', upiTxnId.trim() || undefined);
      setUpiState('claimed');
      showToast({ title: 'Payment reference sent', description: 'The kitchen will confirm it.', tone: 'success' });
    } catch (err: any) {
      setErrorMsg(`We could not record your payment: ${err?.message || 'database error'}. Please try again.`);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!placedOrder) return;
    setIsDownloading(true);
    try {
      await downloadReceiptPdf(placedOrder, business);
    } catch {
      showToast({ title: 'Could not build the receipt', tone: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareOrder = async () => {
    if (!placedOrder) return;
    const result = await shareOrder(placedOrder, business);
    if (result === 'copied') {
      showToast({ title: 'Order details copied', description: 'Paste them wherever you like.', tone: 'success' });
    } else if (result === 'unavailable') {
      showToast({ title: 'Sharing is not available on this device', tone: 'error' });
    }
  };

  const handleScreenshotPicked = async (file: File | undefined) => {
    if (!file || !placedOrder) return;
    const result = await sharePaymentScreenshot(placedOrder, business, file);
    if (result === 'unsupported') {
      showToast({
        title: 'This device cannot share files',
        description: 'Send the screenshot to the kitchen manually.',
        tone: 'error'
      });
    }
  };

  // ---------------------------------------------------------------- confirmed

  if (placedOrder) {
    const eta = estimatedDeliveryLabel(placedAt ?? new Date(), settings.estimated_delivery_mins);

    return (
      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">

          {/* Success header */}
          <section className="bg-[#121212] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white font-serif">Order Confirmed</h1>
              <p className="text-xs sm:text-sm text-gray-400">Your order is with the kitchen.</p>
            </div>
          </section>

          {/* Key facts */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-[#121212] border border-white/10 rounded-2xl">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Order ID</p>
              <p className="text-lg font-black text-[#C5A059] font-mono mt-1">{placedOrder.order_number}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-1 break-all">{placedOrder.id}</p>
            </div>
            <div className="p-4 bg-[#121212] border border-white/10 rounded-2xl">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Estimated Delivery</p>
              <p className="text-lg font-black text-white mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C5A059] shrink-0" /> {eta}
              </p>
            </div>
          </section>

          {/* Items + total */}
          <section className="bg-[#121212] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
            <h2 className="text-sm font-black text-white font-serif flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-[#C5A059]" /> Your Items
            </h2>
            <ul className="space-y-2 text-xs">
              {placedOrder.items.map((item, i) => (
                <li key={`${item.dish_id}-${i}`} className="flex justify-between gap-3 text-gray-300">
                  <span className="min-w-0 break-words">
                    {item.dish_name} <span className="text-gray-500">× {item.quantity}</span>
                  </span>
                  <span className="font-bold text-white shrink-0">₹{item.price * item.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span><span className="font-bold text-white">₹{placedOrder.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Delivery</span>
                <span className="font-bold">
                  {placedOrder.delivery_fee === 0
                    ? <span className="text-emerald-400 font-black uppercase">Free</span>
                    : `₹${placedOrder.delivery_fee}`}
                </span>
              </div>
              {placedOrder.tax_amount > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span><span className="font-bold text-white">₹{placedOrder.tax_amount}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/10 text-base font-black text-white">
                <span>Total</span><span className="text-[#C5A059]">₹{placedOrder.total_amount}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Payment Status</span>
              <span className={`text-xs font-black px-3 py-1.5 rounded-full border ${
                upiState === 'claimed'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {placedOrder.payment_method === 'UPI' && upiState === 'claimed'
                  ? 'Payment Success'
                  : paymentLabel(placedOrder)}
              </span>
            </div>
          </section>

          {/* UPI settlement, after the order already exists */}
          {placedOrder.payment_method === 'UPI' && (
            <section className="bg-[#121212] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
              {upiState === 'claimed' ? (
                <div className="text-center space-y-1.5 py-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-black text-emerald-400">Payment Success</p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    Your reference has been sent to the kitchen. They will confirm the transfer before dispatch.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-black text-amber-400 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" /> Payment Pending
                    </p>
                    <p className="text-[11px] text-gray-400">Pay ₹{placedOrder.total_amount} using any UPI app.</p>
                  </div>

                  <div className="bg-white p-3 rounded-2xl w-fit mx-auto">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`}
                      alt={`UPI QR code to pay ₹${placedOrder.total_amount}`}
                      className="w-40 h-40 sm:w-48 sm:h-48"
                    />
                  </div>

                  {/* UPI Intent — opens the installed UPI app directly */}
                  <a
                    href={upiUri}
                    className="w-full min-h-[48px] px-4 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-2xl transition text-sm flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" /> Pay with UPI App
                  </a>

                  <div className="flex items-stretch gap-2">
                    <code className="flex-1 min-w-0 text-xs text-white bg-[#181818] px-3 rounded-xl border border-white/10 font-mono flex items-center truncate">
                      {settings.restaurant_upi_id}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUpiId}
                      className="min-h-[44px] px-4 rounded-xl bg-[#181818] border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy ID'}
                    </button>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={upiTxnId}
                    onChange={(e) => setUpiTxnId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="UPI transaction reference (optional)"
                    aria-label="UPI transaction reference"
                    className="w-full min-h-[48px] px-4 bg-[#181818] border border-white/10 rounded-xl text-xs font-mono text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleClaimUpiPayment}
                      className="min-h-[48px] px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition text-xs"
                    >
                      I've Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => screenshotInput.current?.click()}
                      className="min-h-[48px] px-4 bg-[#181818] border border-white/10 text-gray-300 hover:bg-white/5 font-bold rounded-xl transition text-xs flex items-center justify-center gap-2"
                    >
                      <ImageUp className="w-4 h-4" /> Share Screenshot
                    </button>
                    <input
                      ref={screenshotInput}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        handleScreenshotPicked(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </>
              )}
            </section>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onTrackOrder(placedOrder)}
              className="min-h-[52px] px-4 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-2xl transition text-sm flex items-center justify-center gap-2 sm:col-span-2"
            >
              <Truck className="w-4 h-4" /> Track Order
            </button>
            <button
              type="button"
              onClick={handleDownloadReceipt}
              disabled={isDownloading}
              className="min-h-[48px] px-4 bg-[#181818] border border-white/10 hover:bg-white/5 text-gray-300 font-bold rounded-2xl transition text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDownloading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
                : <><Download className="w-4 h-4" /> Download Receipt</>}
            </button>
            <button
              type="button"
              onClick={handleShareOrder}
              className="min-h-[48px] px-4 bg-[#181818] border border-white/10 hover:bg-white/5 text-gray-300 font-bold rounded-2xl transition text-xs flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" /> Share Order
            </button>
            <button
              type="button"
              onClick={onBackToMenu}
              className="min-h-[48px] px-4 text-gray-400 hover:text-white font-bold rounded-2xl transition text-xs sm:col-span-2"
            >
              Back to Menu
            </button>
          </section>
        </div>
      </main>
    );
  }

  // ----------------------------------------------------------------- checkout

  const inputClass =
    'w-full min-h-[48px] pl-11 pr-4 bg-[#181818] border border-white/10 rounded-2xl text-sm text-white ' +
    'placeholder-gray-500 outline-none focus:border-[#C5A059] transition';

  return (
    <main className="flex-1 px-4 py-6 sm:py-10 pb-32 lg:pb-10">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">

        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToMenu}
            aria-label="Back to menu"
            className="w-11 h-11 shrink-0 rounded-2xl bg-[#181818] border border-white/10 text-gray-400 hover:text-white transition flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white font-serif tracking-tight">Checkout</h1>
            <p className="text-[11px] sm:text-xs text-gray-400">Confirm your details and choose how to pay.</p>
          </div>
        </header>

        {cart.length === 0 ? (
          <div className="bg-[#121212] border border-white/10 rounded-3xl p-10 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-[#C5A059] mx-auto" />
            <p className="text-sm font-bold text-white">Your cart is empty</p>
            <p className="text-xs text-gray-400">Add something from the menu to get started.</p>
            <button
              type="button"
              onClick={onBackToMenu}
              className="mt-1 min-h-[48px] px-6 bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-2xl transition text-xs"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-words">{errorMsg}</span>
              </div>
            )}

            {/* Delivery details */}
            <section className="bg-[#121212] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
              <h2 className="text-sm font-black text-white font-serif">Delivery Details</h2>

              <div className="space-y-1.5">
                <label htmlFor="co-name" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="co-name" type="text" value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name" className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="co-phone" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="co-phone" type="tel" inputMode="numeric" maxLength={PHONE_LENGTH}
                    value={phone} onChange={(e) => setPhone(toPhoneDigits(e.target.value))}
                    placeholder="10-digit mobile number" className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="co-address" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Delivery Address *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="co-address" type="text" value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your delivery address" className={inputClass}
                  />
                </div>
              </div>

              <input
                type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)}
                placeholder="Landmark (optional)" aria-label="Landmark (optional)"
                className="w-full min-h-[48px] px-4 bg-[#181818] border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 outline-none focus:border-[#C5A059] transition"
              />
            </section>

            {/* Payment — large tap-friendly cards */}
            <section className="bg-[#121212] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-3">
              <h2 className="text-sm font-black text-white font-serif">Payment Method</h2>

              <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { key: 'COD' as const, icon: Wallet, title: 'Cash on Delivery', blurb: 'Pay the rider when it arrives.' },
                  { key: 'UPI' as const, icon: QrCode, title: 'UPI QR Payment', blurb: 'Scan or open your UPI app after ordering.' }
                ]).map(({ key, icon: Icon, title, blurb }) => {
                  const selected = paymentMethod === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPaymentMethod(key)}
                      className={`relative min-h-[112px] p-5 rounded-2xl border-2 text-left transition ${
                        selected
                          ? 'border-[#C5A059] bg-[#C5A059]/10'
                          : 'border-white/10 bg-[#181818] hover:bg-white/5'
                      }`}
                    >
                      {selected && (
                        <CheckCircle2 className="w-5 h-5 text-[#C5A059] absolute top-4 right-4" />
                      )}
                      <Icon className={`w-7 h-7 mb-2.5 ${selected ? 'text-[#C5A059]' : 'text-gray-400'}`} />
                      <p className={`text-sm font-black ${selected ? 'text-[#C5A059]' : 'text-white'}`}>{title}</p>
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{blurb}</p>
                    </button>
                  );
                })}
              </div>

              {paymentMethod === 'UPI' && (
                <p className="text-[11px] text-gray-400 bg-[#181818] border border-white/10 rounded-2xl p-3.5 leading-relaxed">
                  The QR code, UPI app link and UPI ID appear on the next screen, once your order is saved — so
                  you never pay for an order that failed to reach the kitchen.
                </p>
              )}
            </section>

            {/* Order summary */}
            <section className="bg-[#121212] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-3">
              <h2 className="text-sm font-black text-white font-serif">
                Order Summary
                <span className="ml-2 text-[11px] font-bold text-gray-500">
                  {cart.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </h2>

              <ul className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {cart.map(item => (
                  <li key={item.menuItem.id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="flex items-start gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${item.menuItem.is_veg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="text-gray-300 break-words">
                        {item.menuItem.name}
                        <span className="text-gray-500"> × {item.quantity}</span>
                      </span>
                    </span>
                    <span className="font-bold text-white shrink-0">₹{item.menuItem.price * item.quantity}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs">
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
                <div className="flex justify-between pt-2.5 border-t border-white/10 text-base font-black text-white">
                  <span>Total</span><span className="text-[#C5A059]">₹{grandTotal}</span>
                </div>
              </div>
            </section>

            {/* Inline CTA for wide screens */}
            <div className="hidden lg:block space-y-2">
              {!validation.valid && (
                <p className="text-[11px] text-[#C5A059] text-center">{validation.message}</p>
              )}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPlacing || !validation.valid}
                className="w-full min-h-[52px] bg-[#C5A059] hover:bg-[#b38f48] text-black font-black rounded-2xl shadow-lg shadow-[#C5A059]/20 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlacing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Placing your order…</>
                  : <><CheckCircle2 className="w-4 h-4" /> Place Order • ₹{grandTotal}</>}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Sticky bottom bar — the primary action stays reachable on phones without
          scrolling back down past the summary. Hidden once the cart is empty. */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-[#0d0d0d]/95 backdrop-blur border-t border-white/10 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {!validation.valid && (
            <p className="text-[11px] text-[#C5A059] text-center mb-2 leading-snug">{validation.message}</p>
          )}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isPlacing || !validation.valid}
            className="w-full min-h-[52px] bg-[#C5A059] hover:bg-[#b38f48] active:scale-[0.99] text-black font-black rounded-2xl shadow-lg transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlacing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Placing your order…</>
              : <><CheckCircle2 className="w-4 h-4" /> Place Order • ₹{grandTotal}</>}
          </button>
        </div>
      )}
    </main>
  );
};
