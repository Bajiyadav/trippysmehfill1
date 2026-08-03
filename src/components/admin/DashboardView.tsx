import React, { useState, useMemo } from 'react';
import { Order, Feedback } from '../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import {
  ShoppingBag,
  DollarSign,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  Calendar
} from 'lucide-react';

interface DashboardViewProps {
  orders: Order[];
  feedback: Feedback[];
}

interface DailyData {
  dateKey: string;
  displayDate: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenue: number;
}

// Helper to safely parse dates formatted as "27/7/2026, 3:43:22 pm" or ISO
function parseOrderDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  // Try parsing DD/MM/YYYY, HH:MM:SS format
  const parts = dateStr.split(',');
  if (parts[0]) {
    const dateParts = parts[0].trim().split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return new Date();
}

export const DashboardView: React.FC<DashboardViewProps> = ({ orders, feedback }) => {
  const [chartMetric, setChartMetric] = useState<'orders' | 'revenue'>('orders');

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

  // Compute Daily Aggregations for the Chart
  const chartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const daysMap = new Map<string, DailyData>();

    // 1. Group actual orders by date
    orders.forEach((order) => {
      const dateObj = parseOrderDate(order.created_at);
      const year = dateObj.getFullYear();
      const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dateObj.getDate()).padStart(2, '0');
      
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const displayDate = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`;

      if (!daysMap.has(dateKey)) {
        daysMap.set(dateKey, {
          dateKey,
          displayDate,
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          revenue: 0,
        });
      }

      const current = daysMap.get(dateKey)!;
      current.totalOrders += 1;
      if (order.status === 'delivered') {
        current.deliveredOrders += 1;
        current.revenue += order.total_amount;
      } else if (order.status === 'cancelled') {
        current.cancelledOrders += 1;
      }
    });

    // 2. Ensure continuous 7-day view leading up to today
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const year = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      if (!daysMap.has(dateKey)) {
        daysMap.set(dateKey, {
          dateKey,
          displayDate: `${d.getDate()} ${monthNames[d.getMonth()]}`,
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          revenue: 0,
        });
      }
    }

    // Sort chronologically by dateKey
    return Array.from(daysMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [orders]);

  // Today's specific numbers
  const todayKey = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  })();
  const todayStats = chartData.find(d => d.dateKey === todayKey) || { totalOrders: 0, revenue: 0 };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-gray-200">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-white font-serif tracking-wide">Dashboard</h1>
          <p className="text-xs text-gray-400">Real-time order performance & kitchen analytics at Trippy's Mehfill.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#181818] border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-[#C5A059]">
          <Calendar className="w-3.5 h-3.5" />
          <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Row 1 Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg relative overflow-hidden">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Orders Today</p>
          <p className="text-2xl font-black text-white mt-1">{todayStats.totalOrders}</p>
          <div className="absolute right-3 bottom-3 p-2 bg-amber-500/10 text-amber-400 rounded-xl">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg relative overflow-hidden">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Orders This Week</p>
          <p className="text-2xl font-black text-[#C5A059] mt-1">{totalOrders}</p>
          <div className="absolute right-3 bottom-3 p-2 bg-[#C5A059]/10 text-[#C5A059] rounded-xl">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg relative overflow-hidden">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Orders This Month</p>
          <p className="text-2xl font-black text-white mt-1">{totalOrders}</p>
          <div className="absolute right-3 bottom-3 p-2 bg-blue-500/10 text-blue-400 rounded-xl">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg relative overflow-hidden">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Average Rating</p>
          <p className="text-2xl font-black text-[#C5A059] mt-1">{avgRating} <span className="text-xs text-gray-500 font-normal">/ 5</span></p>
          <div className="absolute right-3 bottom-3 p-2 bg-amber-500/10 text-amber-400 rounded-xl">
            <Star className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Row 2 Revenue Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Revenue Today</p>
          <p className="text-2xl font-black text-white mt-1">₹{todayStats.revenue}</p>
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
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pending Orders</p>
          <p className="text-2xl font-black text-[#C5A059] mt-1">{pendingCount}</p>
        </div>
      </div>

      {/* VISUAL ORDER PERFORMANCE CHART (RECHARTS) */}
      <div className="bg-[#121212] rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#181818] border border-[#C5A059]/40 rounded-xl text-[#C5A059]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white font-serif tracking-tight">Order Performance per Day</h2>
              <p className="text-xs text-gray-400">Daily breakdown of kitchen volume and revenue trend</p>
            </div>
          </div>

          {/* Metric Selector Toggle */}
          <div className="flex items-center p-1 bg-[#181818] border border-white/10 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setChartMetric('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                chartMetric === 'orders'
                  ? 'bg-[#C5A059] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Orders / Day</span>
            </button>
            <button
              onClick={() => setChartMetric('revenue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 ${
                chartMetric === 'revenue'
                  ? 'bg-[#C5A059] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Revenue (₹)</span>
            </button>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === 'orders' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#333333' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#333333' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181818',
                    borderColor: 'rgba(197, 160, 89, 0.4)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  formatter={(value: any) => [`${value} orders`, 'Volume']}
                  labelStyle={{ color: '#C5A059', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar dataKey="totalOrders" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.totalOrders > 0 ? '#C5A059' : '#262626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#333333' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#333333' }}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181818',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  formatter={(value: any) => [`₹${value}`, 'Revenue']}
                  labelStyle={{ color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend / Helper Footer */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-white/5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />
              <span>Orders Volume</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Revenue (₹)</span>
            </span>
          </div>
          <p className="text-gray-500 hidden sm:block">Updated automatically on new order events</p>
        </div>
      </div>

      {/* Row 3 Status Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121212] rounded-2xl p-4 border border-white/10 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Assigned</p>
          <p className="text-2xl font-black text-blue-400 mt-1">
            {orders.filter(o => o.status === 'assigned' || o.status === 'out_for_delivery').length}
          </p>
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

