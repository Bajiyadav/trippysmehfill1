-- ========================================================
-- TRIPPY'S MEHFILL - FULL SUPABASE DATABASE MIGRATION SCRIPT
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (User roles & credentials)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  hostel_address TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff', 'driver')),
  is_approved BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. KITCHEN SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.kitchen_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kitchen_name TEXT NOT NULL DEFAULT 'Trippy''s Mehfill',
  is_open BOOLEAN NOT NULL DEFAULT true,
  opening_time TEXT DEFAULT '09:00 AM',
  closing_time TEXT DEFAULT '10:00 PM',
  min_order_value NUMERIC DEFAULT 80,
  free_delivery_above NUMERIC DEFAULT 200,
  delivery_charge NUMERIC DEFAULT 30,
  tax_percent NUMERIC DEFAULT 0,
  estimated_delivery_mins INTEGER DEFAULT 30,
  restaurant_upi_id TEXT DEFAULT '7671018757-2@ybl',
  whatsapp_number TEXT DEFAULT '8569955029',
  closed_banner_message TEXT DEFAULT 'RESTAURANT IS CURRENTLY CLOSED (Opening Hours: 9:00 AM to 10:00 PM) - you can still browse the menu.',
  lat NUMERIC DEFAULT 17.4483,
  lng NUMERIC DEFAULT 78.3915,
  max_cod_radius_km NUMERIC DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'Biryani',
  image_url TEXT,
  is_veg BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  is_todays_special BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  landmark TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'COD',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  upi_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cooking', 'assigned', 'out_for_delivery', 'delivered', 'cancelled')),
  driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  driver_name TEXT,
  driver_phone TEXT,
  kitchen_notes TEXT,
  campus TEXT,
  rating NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  food_rating INTEGER CHECK (food_rating BETWEEN 1 AND 5),
  taste_rating INTEGER CHECK (taste_rating BETWEEN 1 AND 5),
  packing_rating INTEGER CHECK (packing_rating BETWEEN 1 AND 5),
  delivery_rating INTEGER CHECK (delivery_rating BETWEEN 1 AND 5),
  driver_name TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  quantity NUMERIC NOT NULL DEFAULT 0,
  low_alert_threshold NUMERIC DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PROMOTIONAL BANNERS TABLE
CREATE TABLE IF NOT EXISTS public.promotional_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. GALLERY IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_type TEXT DEFAULT 'image',
  title TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- AUTOMATIC USER PROFILE CREATION TRIGGER
-- ========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, hostel_address, role, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'hostel_address', ''),
    'customer',
    false -- Requires Admin approval
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

-- Allow public read access to public tables
CREATE POLICY "Public read menu" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON public.kitchen_settings FOR SELECT USING (true);
CREATE POLICY "Public read banners" ON public.promotional_banners FOR SELECT USING (true);
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public update orders" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Public profiles access" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Public feedback access" ON public.feedback FOR ALL USING (true);
CREATE POLICY "Public inventory access" ON public.inventory FOR ALL USING (true);

-- ========================================================
-- INITIAL SEED DATA
-- ========================================================

INSERT INTO public.kitchen_settings (kitchen_name, is_open, opening_time, closing_time, min_order_value, free_delivery_above, delivery_charge, restaurant_upi_id, whatsapp_number)
VALUES ('Trippy''s Mehfill', true, '09:00 AM', '10:00 PM', 80, 200, 30, '7671018757-2@ybl', '8569955029')
ON CONFLICT DO NOTHING;

INSERT INTO public.menu_items (name, description, price, category, image_url, is_veg, is_available, is_todays_special)
VALUES
  ('Chicken Dum Biryani', 'Slow-cooked on dum with tender chicken, boiled egg, fried onions, and mint.', 180, 'Biryani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80', false, true, true),
  ('Chicken 65 Biryani', 'Crispy Chicken 65 tossed through smoky dum biryani rice with boiled egg.', 190, 'Biryani', 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&q=80', false, true, true),
  ('Trippy''s Mehffil SP CB', 'Crispy fried Chicken 65-style masala pieces with boiled egg layered through satisfying dum biryani rice.', 220, 'Biryani', 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&q=80', false, true, false),
  ('Home made Ghee Dosa (3 Pcs)', 'A perfectly crisp dosa generously roasted with pure desi ghee.', 100, 'South Indian', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80', true, true, false)
ON CONFLICT DO NOTHING;
