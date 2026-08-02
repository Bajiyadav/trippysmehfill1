import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { UserCheck, Search, Plus, Mail, Phone, MapPin, Key, Trash2, CheckCircle, XCircle, ShieldAlert, User, Calendar } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface CustomersViewProps {
  customersList: UserProfile[];
  onAddCustomer: (user: UserProfile) => void;
  onToggleActive: (userId: string) => void;
  onDeleteCustomer: (userId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customersList,
  onAddCustomer,
  onToggleActive,
  onDeleteCustomer
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [successMsg, setSuccessMsg] = useState('');

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    const newCust: UserProfile = {
      id: 'c-' + Date.now(),
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      phone: phone.trim() || '9876543210',
      hostel_address: hostelAddress.trim() || 'Goenka University Campus - Hostel Gate 5',
      role: 'customer',
      is_approved: true,
      is_active: true,
      created_at: new Date().toLocaleString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').insert([newCust]);
      } catch (err) {
        console.error('Failed to save customer to Supabase:', err);
      }
    }

    onAddCustomer(newCust);
    setSuccessMsg(`Customer account created for ${fullName}! Can now login with ${email}`);
    setTimeout(() => setSuccessMsg(''), 4000);

    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setHostelAddress('');
  };

  const filteredCustomers = customersList.filter(c => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.hostel_address && c.hostel_address.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? c.is_active :
      !c.is_active;

    return matchesSearch && matchesStatus;
  });

  const activeCount = customersList.filter(c => c.is_active).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-gray-200">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-serif tracking-wide flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-[#C5A059]" />
            <span>Registered Customers</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            View all customer accounts created with email & password on Trippy's Mehfill.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-[#121212] border border-white/10 px-3.5 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-gray-400 font-medium">Total Registered:</span>
            <span className="text-white font-extrabold text-sm">{customersList.length}</span>
          </div>
          <div className="bg-[#121212] border border-white/10 px-3.5 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-gray-400 font-medium">Active:</span>
            <span className="text-emerald-400 font-extrabold text-sm">{activeCount}</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Account Creation Panel */}
      <div className="bg-[#121212] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm font-serif">
          <Plus className="w-4 h-4 text-[#C5A059]" />
          <span>Create Customer Account (Email & Password Login)</span>
        </div>

        <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <input
            type="text"
            placeholder="Full Name *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="p-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />
          <input
            type="email"
            placeholder="Email Address *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />
          <input
            type="password"
            placeholder="Password *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="p-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />
          <input
            type="text"
            placeholder="Hostel / Delivery Address"
            value={hostelAddress}
            onChange={(e) => setHostelAddress(e.target.value)}
            className="p-2.5 bg-[#181818] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />

          <button
            type="submit"
            className="py-2.5 bg-[#C5A059] hover:bg-[#b38f48] text-black font-extrabold rounded-xl shadow-lg shadow-[#C5A059]/20 transition flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" />
            <span>Register Customer</span>
          </button>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#121212] p-4 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by name, mail, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#C5A059]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="text-gray-400 font-medium">Filter:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'all'
                ? 'bg-[#C5A059] text-black'
                : 'bg-[#181818] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            All ({customersList.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'active'
                ? 'bg-emerald-500 text-black'
                : 'bg-[#181818] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'inactive'
                ? 'bg-rose-500 text-white'
                : 'bg-[#181818] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            Inactive ({customersList.length - activeCount})
          </button>
        </div>
      </div>

      {/* Customer Accounts Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-[#121212] rounded-2xl p-10 text-center border border-white/10 shadow-xl">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-white font-bold">No registered customer accounts found.</p>
          <p className="text-xs text-gray-400 mt-1">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Create a customer account above or users will register when signing up on the app.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="bg-[#121212] rounded-2xl p-5 border border-white/10 hover:border-[#C5A059]/40 shadow-xl transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#C5A059]/20 border border-[#C5A059]/30 text-[#C5A059] font-black flex items-center justify-center text-base">
                      {cust.full_name ? cust.full_name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-sm line-clamp-1">{cust.full_name}</h3>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059]">
                        Customer
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                      cust.is_active
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {cust.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{cust.is_active ? 'Active' : 'Disabled'}</span>
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs pt-1">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                    <span className="truncate">{cust.email}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                    <span>{cust.phone || 'N/A'}</span>
                  </div>

                  {cust.hostel_address && (
                    <div className="flex items-start gap-2 text-gray-300">
                      <MapPin className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-gray-400 text-[11px]">{cust.hostel_address}</span>
                    </div>
                  )}

                  {cust.created_at && (
                    <div className="flex items-center gap-2 text-gray-500 text-[11px] pt-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>Registered: {cust.created_at}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => onToggleActive(cust.id)}
                  className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 text-[11px] ${
                    cust.is_active
                      ? 'bg-[#181818] hover:bg-rose-500/20 text-rose-400 border border-white/10'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {cust.is_active ? 'Disable Login' : 'Enable Login'}
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete account for ${cust.full_name}?`)) {
                      onDeleteCustomer(cust.id);
                    }
                  }}
                  className="p-2 rounded-xl bg-[#181818] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-white/10 transition"
                  title="Delete Customer Account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
