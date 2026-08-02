import React, { useState } from 'react';
import { UserProfile, Order } from '../../types';
import { Bike, Star, CheckCircle, Clock, ShieldCheck } from 'lucide-react';

interface DriverStatsViewProps {
  drivers: UserProfile[];
  orders: Order[];
}

export const DriverStatsView: React.FC<DriverStatsViewProps> = ({ drivers, orders }) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');

  const driver = drivers.find(d => d.id === selectedDriverId) || drivers[0];

  const driverOrders = orders.filter(o => o.driver_name === driver?.full_name);
  const completedCount = driverOrders.filter(o => o.status === 'delivered').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-serif">Delivery Partner Stats</h1>
        <p className="text-xs text-gray-500">Pick a partner to see their performance and ratings.</p>
      </div>

      {/* Driver Selector matching video frame 2:20 */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm max-w-md">
        <label className="block text-xs font-bold text-gray-700 mb-1">Select a delivery partner...</label>
        <select
          value={selectedDriverId}
          onChange={(e) => setSelectedDriverId(e.target.value)}
          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-orange-500"
        >
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name} ({d.phone})
            </option>
          ))}
        </select>
      </div>

      {driver && (
        <div className="space-y-6">
          {/* Driver Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Deliveries</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{completedCount}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Average Rating</p>
              <p className="text-2xl font-black text-amber-500 mt-1">5.0 ★</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">On-Time %</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">98%</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
              <span className="inline-block mt-2 px-3 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full">
                ACTIVE / ONLINE
              </span>
            </div>
          </div>

          {/* Assigned Orders History */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-sm text-gray-900 mb-3">Recent Orders Handled by {driver.full_name}</h3>
            {driverOrders.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No orders completed yet by this partner.</p>
            ) : (
              <div className="space-y-2">
                {driverOrders.map((o) => (
                  <div key={o.id} className="p-3 bg-gray-50 rounded-xl text-xs flex justify-between items-center font-medium">
                    <div>
                      <span className="font-extrabold text-orange-600 mr-2">{o.order_number}</span>
                      <span>{o.customer_name} ({o.delivery_address})</span>
                    </div>
                    <span className="font-bold text-emerald-700 uppercase">{o.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
