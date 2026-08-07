-- ====================================================================
-- 0008 — ORDERS TABLE COMPLETE SCHEMA REPAIR & REALTIME SYNC
-- ====================================================================

-- Ensure all columns required for order placement, payment verification, and realtime updates exist on public.orders

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS landmark text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'COD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upi_transaction_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utr_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_time timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kitchen_notes text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS campus text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rating numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_ip text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_latitude double precision;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_longitude double precision;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gps_accuracy numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gps_allowed boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS distance_km numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS device_type text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS os_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS browser_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pin_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fraud_risk_level text DEFAULT 'low';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fraud_risk_reasons text[];
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

-- Ensure order_number is populated for existing rows if null
UPDATE public.orders
SET order_number = '#' || (1000 + floor(random() * 8999)::integer)::text
WHERE order_number IS NULL OR order_number = '';

-- Index for fast lookup by order_number and customer_id
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Reload PostgREST schema cache automatically
NOTIFY pgrst, 'reload schema';
