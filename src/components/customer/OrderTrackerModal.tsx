import React from 'react';
import { Order, OrderStatus } from '../../types';
import { X, MapPin, Phone } from 'lucide-react';
import { OrderProgressTimeline } from './OrderProgressTimeline';

interface OrderTrackerModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onLeaveFeedback?: (order: Order) => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  order,
  isOpen,
  onClose,
  onLeaveFeedback
}) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#121212] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/10 text-gray-200">
        
        {/* Header */}
        <div className="p-5 bg-[#0d0d0d] border-b border-white/10 text-white flex items-center justify-between">
          <div>
            <div className="text-xs text-[#C5A059] font-bold uppercase tracking-wider">Live Tracking</div>
            <h2 className="text-xl font-extrabold font-serif">Order {order.order_number}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Animated progress timeline (handles the cancelled state itself) */}
          <OrderProgressTimeline status={order.status} />

          {/* Delivery Details */}
          <div className="bg-[#181818] rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
            <div className="flex items-start gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Delivery Address</p>
                <p className="text-gray-300">{order.delivery_address}</p>
                {order.landmark && <p className="text-gray-400">Landmark: {order.landmark}</p>}
              </div>
            </div>

            {order.driver_name && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Assigned Delivery Partner</p>
                  <p className="text-gray-300 font-semibold">{order.driver_name}</p>
                </div>
                {order.driver_phone && (
                  <a
                    href={`tel:${order.driver_phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl transition text-xs shadow-md"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Items Summary */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Order Items</h3>
            <div className="space-y-1.5 text-xs">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-gray-300 font-medium py-1 border-b border-white/5">
                  <span>{item.dish_name} <strong className="text-[#C5A059]">x{item.quantity}</strong></span>
                  <span className="font-bold text-white">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="flex justify-between font-extrabold text-sm text-white pt-2 border-t border-white/10">
                <span>Total Amount ({order.payment_method})</span>
                <span className="text-[#C5A059]">₹{order.total_amount}</span>
              </div>
            </div>
          </div>

          {/* Leave Feedback Action if Delivered */}
          {order.status === 'delivered' && onLeaveFeedback && (
            <button
              onClick={() => { onClose(); onLeaveFeedback(order); }}
              className="w-full py-3 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 transition text-xs"
            >
              ★ Leave Feedback & Rating
            </button>
          )}

        </div>
      </div>
    </div>
  );
};
