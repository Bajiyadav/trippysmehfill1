import React, { useState } from 'react';
import { Order, OrderStatus, UserProfile } from '../../types';
import { Bike, Phone, MapPin, CheckCircle2, Clock, XCircle, ChevronDown } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface LiveOrdersViewProps {
  orders: Order[];
  drivers: UserProfile[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, driverId?: string, driverName?: string) => void;
}

export const LiveOrdersView: React.FC<LiveOrdersViewProps> = ({
  orders,
  drivers,
  onUpdateOrderStatus
}) => {
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});

  const handleAssignAndStatus = (orderId: string, status: OrderStatus) => {
    const driverId = selectedDrivers[orderId];
    const driverObj = drivers.find(d => d.id === driverId);
    onUpdateOrderStatus(orderId, status, driverObj?.id, driverObj?.full_name);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-serif">Live Orders</h1>
        <p className="text-xs text-gray-500">New orders appear here automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orders.map((order) => {
          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl p-5 border border-orange-100 shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              {/* Top Banner Status */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-lg font-black text-orange-600">{order.order_number}</span>
                  <span className="text-xs text-gray-400 ml-2 font-mono">{order.created_at}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                  order.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'cooking' ? 'bg-amber-100 text-amber-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              {/* Customer Info */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span className="text-sm">{order.customer_name}</span>
                  <a href={`tel:${order.customer_phone}`} className="text-orange-600 underline font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{order.customer_phone}</span>
                  </a>
                </div>

                <div className="flex items-start gap-1.5 text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                  <span>{order.delivery_address}</span>
                </div>

                {order.landmark && (
                  <p className="text-[11px] text-gray-400 italic">Preference: {order.landmark}</p>
                )}
              </div>

              {/* Items List */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-gray-800 font-medium">
                    <span>{it.dish_name} <strong className="text-orange-600">x{it.quantity}</strong></span>
                    <span className="font-bold">₹{it.price * it.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 font-extrabold text-sm text-gray-900">
                  <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
                    {order.payment_method}
                  </span>
                  <span className="text-orange-600">₹{order.total_amount}</span>
                </div>
              </div>

              {/* Driver Assignment Dropdown */}
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="relative">
                    <select
                      value={selectedDrivers[order.id] || order.driver_id || ''}
                      onChange={(e) => setSelectedDrivers({ ...selectedDrivers, [order.id]: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-orange-500"
                    >
                      <option value="">Select Delivery Driver...</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.full_name} ({d.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'cooking')}
                      className="py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition"
                    >
                      Cook in Kitchen
                    </button>
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'out_for_delivery')}
                      className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
                    >
                      Out for Delivery
                    </button>
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'delivered')}
                      className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                    >
                      Mark Delivered
                    </button>
                    <button
                      onClick={() => handleAssignAndStatus(order.id, 'cancelled')}
                      className="py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs transition"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};
