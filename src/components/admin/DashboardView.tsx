import React from 'react';
import { Order, Feedback } from '../../types';
import { ShoppingBag, DollarSign, Star, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface DashboardViewProps {
  orders: Order[];
  feedback: Feedback[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ orders, feedback }) => {
  const totalOrders = orders.length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'cooking').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total_amount, 0);

  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.food_rating + f.taste_rating + f.packing_rating + f.delivery_rating) / 4, 0) / feedback.length).toFixed(1)
    : '5.0';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-gray-200">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white font-serif tracking-wide">Dashboard</h1>
        <p className="text-xs text-gray-400">Everything happening at Trippy's Mehfill.</p>
      </div>

      {/* Row 1 Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Orders Today</p>
          <p className="text-2xl font-black text-white mt-1">0</p>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Orders This Week</p>
          <p className="text-2xl font-black text-[#C5A059] mt-1">{totalOrders}</p>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Orders This Month</p>
          <p className="text-2xl font-black text-white mt-1">{totalOrders}</p>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Average Rating</p>
          <p className="text-2xl font-black text-[#C5A059] mt-1">{avgRating} <span className="text-xs text-gray-500 font-normal">/ 5</span></p>
        </div>
      </div>

      {/* Row 2 Revenue Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Revenue Today</p>
          <p className="text-2xl font-black text-white mt-1">₹0</p>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Revenue This Week</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">₹{totalRevenue}</p>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Revenue This Month</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">₹{totalRevenue}</p>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-black text-[#C5A059] mt-1">{pendingCount}</p>
        </div>
      </div>

      {/* Row 3 Status Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Assigned</p>
          <p className="text-2xl font-black text-blue-400 mt-1">0</p>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Delivered</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{deliveredCount}</p>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cancelled</p>
          <p className="text-2xl font-black text-rose-400 mt-1">{cancelledCount}</p>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-2xl font-black text-white mt-1">{totalOrders}</p>
        </div>
      </div>

      {/* Latest Orders & Feedback Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Latest Orders */}
        <div className="bg-[#121212] rounded-2xl p-5 border border-white/10 shadow-lg">
          <h2 className="font-bold text-base text-white mb-3">Latest orders</h2>
          <div className="space-y-3">
            {orders.slice(0, 4).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-[#181818] rounded-xl border border-white/10 text-xs"
              >
                <div>
                  <span className="font-extrabold text-white mr-2">{order.order_number}</span>
                  <span className="text-gray-300 font-semibold">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">₹{order.total_amount}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    order.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Feedback */}
        <div className="bg-[#121212] rounded-2xl p-5 border border-white/10 shadow-lg">
          <h2 className="font-bold text-base text-white mb-3">Latest feedback</h2>
          <div className="space-y-3">
            {feedback.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No feedback received yet.</p>
            ) : (
              feedback.map((fb) => (
                <div key={fb.id} className="p-3 bg-[#181818] rounded-xl border border-white/10 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>{fb.order_id} - {fb.customer_name}</span>
                    <div className="flex text-[#C5A059]">
                      {'★'.repeat(fb.food_rating)}
                    </div>
                  </div>
                  {fb.comment && <p className="text-gray-400 text-[11px]">{fb.comment}</p>}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
