import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Header } from './components/common/Header';
import { NotificationBanner } from './components/common/NotificationBanner';
import { HeroSection } from './components/customer/HeroSection';
import { CategoryPills } from './components/customer/CategoryPills';
import { TodaysSpecials } from './components/customer/TodaysSpecials';
import { MenuCard } from './components/customer/MenuCard';
import { CartDrawer } from './components/customer/CartDrawer';
import { OrderTrackerModal } from './components/customer/OrderTrackerModal';
import { CustomerFeedbackModal } from './components/customer/CustomerFeedbackModal';
import { AuthModal } from './components/common/AuthModal';

// Admin Components
import { AdminHeaderNav, AdminTab } from './components/admin/AdminHeaderNav';
import { DashboardView } from './components/admin/DashboardView';
import { LiveOrdersView } from './components/admin/LiveOrdersView';
import { KitchenView } from './components/admin/KitchenView';
import { PendingRegistrationsView } from './components/admin/PendingRegistrationsView';
import { MenuManagerView } from './components/admin/MenuManagerView';
import { InventoryView } from './components/admin/InventoryView';
import { OrderHistoryView } from './components/admin/OrderHistoryView';
import { FeedbackView } from './components/admin/FeedbackView';
import { DriverStatsView } from './components/admin/DriverStatsView';
import { StaffDriversView } from './components/admin/StaffDriversView';
import { CustomersView } from './components/admin/CustomersView';
import { SettingsView } from './components/admin/SettingsView';

// Driver Component
import { DriverView } from './components/driver/DriverView';

import {
  initialMenuItems,
  initialOrders,
  initialPendingRegistrations,
  initialStaffAndDrivers,
  initialCustomers,
  initialInventory,
  initialFeedback,
  initialBanners
} from './lib/initialData';
import { FoodCategory, MenuItem, Order, OrderStatus, UserProfile, InventoryItem, Feedback, PromotionalBanner } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';

function MainApp() {
  const { user } = useAuth();
  
  // Navigation & Tabs
  const [activeSection, setActiveSection] = useState<'menu' | 'track' | 'admin' | 'kitchen' | 'driver'>('menu');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  // Customer View Filters
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Goenka University Campus - Gate 5');

  // App Data States
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('trippys_menu');
    return saved ? JSON.parse(saved) : initialMenuItems;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('trippys_orders');
    return saved ? JSON.parse(saved) : initialOrders;
  });

  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('trippys_pending');
    return saved ? JSON.parse(saved) : initialPendingRegistrations;
  });

  const [staffList, setStaffList] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('trippys_staff');
    return saved ? JSON.parse(saved) : initialStaffAndDrivers;
  });

  const [customersList, setCustomersList] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('trippys_customers');
    return saved ? JSON.parse(saved) : initialCustomers;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('trippys_inventory');
    return saved ? JSON.parse(saved) : initialInventory;
  });

  const [feedback, setFeedback] = useState<Feedback[]>(() => {
    const saved = localStorage.getItem('trippys_feedback');
    return saved ? JSON.parse(saved) : initialFeedback;
  });

  const [banners, setBanners] = useState<PromotionalBanner[]>(() => {
    const saved = localStorage.getItem('trippys_banners');
    return saved ? JSON.parse(saved) : initialBanners;
  });

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [feedbackOrder, setFeedbackOrder] = useState<Order | null>(null);

  // Sync to localStorage
  useEffect(() => { localStorage.setItem('trippys_menu', JSON.stringify(menuItems)); }, [menuItems]);
  useEffect(() => { localStorage.setItem('trippys_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('trippys_pending', JSON.stringify(pendingUsers)); }, [pendingUsers]);
  useEffect(() => { localStorage.setItem('trippys_staff', JSON.stringify(staffList)); }, [staffList]);
  useEffect(() => { localStorage.setItem('trippys_customers', JSON.stringify(customersList)); }, [customersList]);
  useEffect(() => { localStorage.setItem('trippys_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('trippys_feedback', JSON.stringify(feedback)); }, [feedback]);
  useEffect(() => { localStorage.setItem('trippys_banners', JSON.stringify(banners)); }, [banners]);

  // Load live data from Supabase if connected
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    async function loadSupabaseData() {
      try {
        const { data: menu } = await supabase.from('menu_items').select('*').order('display_order');
        if (menu && menu.length > 0) setMenuItems(menu as MenuItem[]);

        const { data: ords } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (ords && ords.length > 0) setOrders(ords as Order[]);

        const { data: profs } = await supabase.from('profiles').select('*');
        if (profs && profs.length > 0) {
          const pending = profs.filter(p => !p.is_approved && p.role === 'customer');
          const team = profs.filter(p => p.role === 'admin' || p.role === 'staff' || p.role === 'driver');
          const custs = profs.filter(p => p.role === 'customer' && p.is_approved);
          setPendingUsers(pending as UserProfile[]);
          if (team.length > 0) setStaffList(team as UserProfile[]);
          if (custs.length > 0) setCustomersList(custs as UserProfile[]);
        }
      } catch (err) {
        console.error('Supabase fetch error', err);
      }
    }

    loadSupabaseData();
  }, []);

  // Handlers
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, driverId?: string, driverName?: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status,
            ...(driverId ? { driver_id: driverId } : {}),
            ...(driverName ? { driver_name: driverName } : {})
          };
        }
        return o;
      })
    );

    if (isSupabaseConfigured) {
      supabase.from('orders').update({
        status,
        ...(driverId ? { driver_id: driverId } : {}),
        ...(driverName ? { driver_name: driverName } : {})
      }).eq('id', orderId);
    }
  };

  const handleApproveUser = (userId: string) => {
    const userToApprove = pendingUsers.find(u => u.id === userId);
    setPendingUsers(prev => prev.filter(u => u.id !== userId));

    if (userToApprove) {
      if (userToApprove.role === 'customer') {
        setCustomersList(prev => [...prev, { ...userToApprove, is_approved: true }]);
      } else {
        setStaffList(prev => [...prev, { ...userToApprove, is_approved: true }]);
      }
    }

    if (isSupabaseConfigured) {
      supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
    }
  };

  const handleRejectUser = (userId: string) => {
    setPendingUsers(prev => prev.filter(u => u.id !== userId));

    if (isSupabaseConfigured) {
      supabase.from('profiles').delete().eq('id', userId);
    }
  };

  // Filtered menu dishes for customer storefront
  const filteredDishes = menuItems.filter((dish) => {
    const matchesCategory =
      selectedCategory === 'All' ? true :
      selectedCategory === 'Veg' ? dish.is_veg :
      selectedCategory === 'Non-Veg' ? !dish.is_veg :
      dish.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const todaysSpecials = menuItems.filter(m => m.is_todays_special && m.is_available);
  const drivers = staffList.filter(s => s.role === 'driver');

  return (
    <div className="min-h-screen bg-[#080808] text-gray-200 font-sans flex flex-col antialiased">
      
      {/* Top Closed Banner Notification if kitchen closed */}
      <NotificationBanner />

      {/* Primary Header */}
      <Header
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrders={() => {
          const userOrder = orders.find(o => o.customer_id === user?.id || o.customer_phone === user?.phone);
          if (userOrder) setActiveTrackingOrder(userOrder);
          else alert("No recent orders found.");
        }}
      />

      {/* Admin ERP Sub-Navigation Header */}
      {(activeSection === 'admin' || ((user?.role === 'admin' || user?.role === 'staff') && activeSection !== 'menu' && activeSection !== 'driver')) && (
        <AdminHeaderNav
          activeTab={adminTab}
          setActiveTab={setAdminTab}
          pendingCount={pendingUsers.length}
        />
      )}

      {/* SECTION ROUTING */}

      {/* 1. STOREFRONT MENU VIEW */}
      {activeSection === 'menu' && (
        <main className="flex-1 pb-16">
          <HeroSection
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
          />

          <CategoryPills
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Today's Specials */}
          {!searchQuery && selectedCategory === 'All' && (
            <TodaysSpecials
              specials={todaysSpecials}
              onRequireAuth={() => setIsAuthModalOpen(true)}
            />
          )}

          {/* Main Menu Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8">
            <h2 className="text-xl sm:text-2xl font-black text-[#C5A059] font-serif mb-4 tracking-wide">
              Today's Menu
            </h2>

            {filteredDishes.length === 0 ? (
              <div className="text-center py-12 bg-[#121212] rounded-2xl border border-white/10 shadow-xl">
                <p className="text-gray-200 font-bold">No dishes found matching your search.</p>
                <p className="text-xs text-gray-500 mt-1">Try searching for "biryani" or selecting another category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredDishes.map((dish) => (
                  <MenuCard
                    key={dish.id}
                    item={dish}
                    onRequireAuth={() => setIsAuthModalOpen(true)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* 2. ADMIN ERP MODULE */}
      {activeSection === 'admin' && (
        <main className="flex-1 pb-16">
          {adminTab === 'dashboard' && <DashboardView orders={orders} feedback={feedback} />}
          {adminTab === 'live_orders' && (
            <LiveOrdersView orders={orders} drivers={drivers} onUpdateOrderStatus={handleUpdateOrderStatus} />
          )}
          {adminTab === 'kitchen' && (
            <KitchenView orders={orders} onUpdateOrderStatus={handleUpdateOrderStatus} />
          )}
          {adminTab === 'registrations' && (
            <PendingRegistrationsView pendingUsers={pendingUsers} onApprove={handleApproveUser} onReject={handleRejectUser} />
          )}
          {adminTab === 'menu' && (
            <MenuManagerView
              menuItems={menuItems}
              onSaveDish={(dish) => setMenuItems(prev => {
                const exists = prev.some(m => m.id === dish.id);
                return exists ? prev.map(m => m.id === dish.id ? dish : m) : [dish, ...prev];
              })}
              onDeleteDish={(id) => setMenuItems(prev => prev.filter(m => m.id !== id))}
              onToggleAvailable={(id) => setMenuItems(prev => prev.map(m => m.id === id ? { ...m, is_available: !m.is_available } : m))}
              onToggleSpecial={(id) => setMenuItems(prev => prev.map(m => m.id === id ? { ...m, is_todays_special: !m.is_todays_special } : m))}
            />
          )}
          {adminTab === 'inventory' && (
            <InventoryView
              inventory={inventory}
              menuItems={menuItems}
              onUpdateQuantity={(id, delta) => setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))}
              onAddStockItem={(item) => setInventory(prev => [item, ...prev])}
            />
          )}
          {adminTab === 'history' && <OrderHistoryView orders={orders} drivers={drivers} />}
          {adminTab === 'feedback' && <FeedbackView feedback={feedback} />}
          {adminTab === 'driver_stats' && <DriverStatsView drivers={drivers} orders={orders} />}
          {adminTab === 'staff' && (
            <StaffDriversView
              staffList={staffList}
              onAddStaff={(s) => setStaffList(prev => [...prev, s])}
              onToggleActive={(id) => setStaffList(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s))}
              onDeleteStaff={(id) => setStaffList(prev => prev.filter(s => s.id !== id))}
            />
          )}
          {adminTab === 'customers' && (
            <CustomersView
              customersList={customersList}
              onAddCustomer={(c) => setCustomersList(prev => [...prev, c])}
              onToggleActive={(id) => setCustomersList(prev => prev.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c))}
              onDeleteCustomer={(id) => setCustomersList(prev => prev.filter(c => c.id !== id))}
            />
          )}
          {adminTab === 'settings' && (
            <SettingsView
              banners={banners}
              onAddBanner={(b) => setBanners(prev => [b, ...prev])}
            />
          )}
        </main>
      )}

      {/* 3. DRIVER PORTAL */}
      {activeSection === 'driver' && (
        <main className="flex-1 pb-16">
          <DriverView orders={orders} onUpdateOrderStatus={handleUpdateOrderStatus} />
        </main>
      )}

      {/* GLOBAL MODALS */}
      <CartDrawer
        isOpen={isCartOpen}
        existingOrders={orders}
        onClose={() => setIsCartOpen(false)}
        onOrderSuccess={(newOrder) => {
          setOrders(prev => [newOrder, ...prev]);
          setActiveTrackingOrder(newOrder);
        }}
      />

      <OrderTrackerModal
        isOpen={Boolean(activeTrackingOrder)}
        order={activeTrackingOrder}
        onClose={() => setActiveTrackingOrder(null)}
        onLeaveFeedback={(ord) => setFeedbackOrder(ord)}
      />

      <CustomerFeedbackModal
        isOpen={Boolean(feedbackOrder)}
        order={feedbackOrder}
        onClose={() => setFeedbackOrder(null)}
        onSubmitSuccess={(fb) => setFeedback(prev => [fb, ...prev])}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-[#0d0d0d] text-gray-400 text-xs py-8 px-4 border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div>
            <p className="font-extrabold text-[#C5A059] text-sm tracking-wide font-serif">Trippy's Mehfill — Hyderabad's Cloud Kitchen ERP</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Authentic Hyderabadi Dum Biryani, Dosas & Express Delivery</p>
          </div>
          <p className="text-[11px] text-gray-500">© 2026 Trippy's Mehfill. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}
