-- =====================================================
-- VIZION MENU - COMPLETE DATABASE SETUP (SUPABASE COMPATIBLE)
-- Multi-Tenant Restaurant Ordering System
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SECTION 1: CORE TABLES SETUP
-- =====================================================

-- User Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant Chains (Multi-brand support)
CREATE TABLE IF NOT EXISTS restaurant_chains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches (Individual restaurant locations)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain_id UUID REFERENCES restaurant_chains(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  email TEXT,
  address JSONB, -- {street, city, state, postal_code, country}
  location POINT, -- Geographic coordinates
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chain_id, slug)
);

-- Branch Users (Multi-branch user management)
CREATE TABLE IF NOT EXISTS branch_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'branch_staff', -- chain_owner, branch_manager, branch_staff, branch_cashier
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

-- Menu Categories (Branch-specific)
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  icon TEXT, -- Lucide icon key for professional category display
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Items (Branch-specific)
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  allergens TEXT[],
  dietary_info TEXT[],
  preparation_time INTEGER,
  is_available BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Item Variants
CREATE TABLE IF NOT EXISTS menu_item_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders (Branch-specific)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  order_type TEXT NOT NULL,
  table_number TEXT,
  delivery_address JSONB,
  order_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  special_instructions TEXT,
  estimated_ready_time TIMESTAMPTZ,
  third_party_order_id TEXT,
  third_party_platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  menu_item_name TEXT NOT NULL,
  menu_item_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  item_total DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Item Variants
CREATE TABLE IF NOT EXISTS order_item_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Presets (Smart preset management for different meal times/seasons)
CREATE TABLE IF NOT EXISTS menu_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  menu_data JSONB NOT NULL, -- Complete menu state snapshot with categories and items
  is_active BOOLEAN DEFAULT FALSE,
  
  -- One-time scheduling fields
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  
  -- Daily recurring scheduling fields
  schedule_type TEXT DEFAULT 'one-time' CHECK (schedule_type IN ('one-time', 'daily')),
  daily_start_time TIME, -- Daily start time (e.g., '07:00:00')
  daily_end_time TIME,   -- Daily end time (e.g., '11:00:00')
  
  auto_apply BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 2: FUNCTIONS (PUBLIC SCHEMA ONLY)
-- =====================================================

-- Helper function for getting user claims (public schema)
CREATE OR REPLACE FUNCTION public.get_user_branch_info(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
BEGIN
  SELECT jsonb_build_object(
    'chain_id', rc.id::text,
    'branch_id', bu.branch_id::text,
    'role', bu.role,
    'permissions', bu.permissions,
    'chain_name', rc.name,
    'branch_name', b.name
  ) INTO claims
  FROM branch_users bu
  JOIN branches b ON b.id = bu.branch_id
  JOIN restaurant_chains rc ON rc.id = b.chain_id
  WHERE bu.user_id = $1 AND bu.is_active = true
  LIMIT 1;
  
  RETURN COALESCE(claims, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Auth trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 3: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_chains_slug ON restaurant_chains(slug);
CREATE INDEX IF NOT EXISTS idx_branches_chain_id ON branches(chain_id);
CREATE INDEX IF NOT EXISTS idx_branches_slug ON branches(chain_id, slug);
CREATE INDEX IF NOT EXISTS idx_branch_users_user_id ON branch_users(user_id);
CREATE INDEX IF NOT EXISTS idx_branch_users_branch_id ON branch_users(branch_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_branch_id ON menu_categories(branch_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_branch_id ON menu_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- =====================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_variants ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can access own profile
DROP POLICY IF EXISTS "Users can access own profile" ON user_profiles;
CREATE POLICY "Users can access own profile" ON user_profiles
FOR ALL USING (auth.uid() = user_id);

-- Restaurant Chains: Public read, chain owners can manage
DROP POLICY IF EXISTS "Public can read chains" ON restaurant_chains;
CREATE POLICY "Public can read chains" ON restaurant_chains
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Chain owners can manage chains" ON restaurant_chains;
CREATE POLICY "Chain owners can manage chains" ON restaurant_chains
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users bu 
  JOIN branches b ON b.id = bu.branch_id 
  WHERE b.chain_id = restaurant_chains.id 
  AND bu.user_id = auth.uid() 
  AND bu.role = 'chain_owner'
));

-- Branches: Public read, branch users can access
DROP POLICY IF EXISTS "Public can read branches" ON branches;
CREATE POLICY "Public can read branches" ON branches
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Branch users can access branches" ON branches;
CREATE POLICY "Branch users can access branches" ON branches
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = branches.id 
  AND branch_users.user_id = auth.uid()
));

-- Branch Users: Branch managers and chain owners can manage (UPDATED)
DROP POLICY IF EXISTS "Branch managers can manage users" ON branch_users;
CREATE POLICY "Branch managers can manage users" ON branch_users
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users bu
  WHERE bu.branch_id = branch_users.branch_id
  AND bu.user_id = auth.uid()
  AND bu.is_active = true
  AND bu.role IN ('chain_owner', 'branch_manager')
));

-- Menu Categories: Public read, branch staff can manage
DROP POLICY IF EXISTS "Public can read menu categories" ON menu_categories;
CREATE POLICY "Public can read menu categories" ON menu_categories
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Branch staff can manage categories" ON menu_categories;
CREATE POLICY "Branch staff can manage categories" ON menu_categories
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = menu_categories.branch_id 
  AND branch_users.user_id = auth.uid()
));

-- Menu Items: Public read, branch staff can manage
DROP POLICY IF EXISTS "Public can read menu items" ON menu_items;
CREATE POLICY "Public can read menu items" ON menu_items
FOR SELECT USING (is_available = true);

DROP POLICY IF EXISTS "Branch staff can manage menu items" ON menu_items;
CREATE POLICY "Branch staff can manage menu items" ON menu_items
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = menu_items.branch_id 
  AND branch_users.user_id = auth.uid()
));

-- Menu Presets: Branch staff can manage presets
DROP POLICY IF EXISTS "Branch staff can manage menu presets" ON menu_presets;
CREATE POLICY "Branch staff can manage menu presets" ON menu_presets
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = menu_presets.branch_id 
  AND branch_users.user_id = auth.uid()
));

-- Orders: Branch staff can access orders
DROP POLICY IF EXISTS "Branch staff can access orders" ON orders;
CREATE POLICY "Branch staff can access orders" ON orders
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = orders.branch_id 
  AND branch_users.user_id = auth.uid()
));

-- =====================================================
-- SECTION 5: TRIGGERS
-- =====================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurant_chains_updated_at ON restaurant_chains;
CREATE TRIGGER update_restaurant_chains_updated_at 
  BEFORE UPDATE ON restaurant_chains 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
CREATE TRIGGER update_branches_updated_at 
  BEFORE UPDATE ON branches 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_branch_users_updated_at ON branch_users;
CREATE TRIGGER update_branch_users_updated_at 
  BEFORE UPDATE ON branch_users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_categories_updated_at ON menu_categories;
CREATE TRIGGER update_menu_categories_updated_at 
  BEFORE UPDATE ON menu_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at 
  BEFORE UPDATE ON menu_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_presets_updated_at ON menu_presets;
CREATE TRIGGER update_menu_presets_updated_at 
  BEFORE UPDATE ON menu_presets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SECTION 6: MIGRATION UPDATES (From old schema)
-- =====================================================

-- Update Menu Categories (Add branch_id if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'menu_categories' AND column_name = 'branch_id') THEN
    ALTER TABLE menu_categories ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update Menu Items (Change restaurant_id to branch_id if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'menu_items' AND column_name = 'restaurant_id') THEN
    ALTER TABLE menu_items RENAME COLUMN restaurant_id TO branch_id;
  END IF;
END $$;

-- Update Orders (Change restaurant_id to branch_id if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'orders' AND column_name = 'restaurant_id') THEN
    ALTER TABLE orders RENAME COLUMN restaurant_id TO branch_id;
  END IF;
END $$;

-- =====================================================
-- SECTION 7: AUTH TRIGGER SETUP
-- =====================================================
-- NOT: Bu trigger'ı Supabase Dashboard'dan manuel olarak eklemeniz gerekebilir
-- Authentication > Hooks bölümünden veya Database > Functions bölümünden ekleyebilirsiniz

-- Auth trigger için not:
-- Supabase Dashboard > Database > Functions > Create a new function
-- Function name: handle_new_user
-- Schema: public
-- Return type: trigger
-- Definition: Yukarıdaki handle_new_user fonksiyonunu kopyalayın

-- Sonra Database > Triggers > Create a new trigger
-- Name: on_auth_user_created
-- Table: auth.users
-- Events: INSERT
-- Function: public.handle_new_user()

-- =====================================================
-- SECTION 8: TEST DATA (Optional - Comment out in production)
-- =====================================================

-- Test Restaurant Chain
INSERT INTO restaurant_chains (id, name, slug, description, logo_url, is_active) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'VizionMenu Test Chain',
  'vizionmenu-test',
  'Test restaurant chain for development',
  'https://example.com/logo.png',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Test Branches
INSERT INTO branches (id, chain_id, name, slug, phone, email, address, is_active) VALUES
(
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440001',
  'Downtown Branch',
  'downtown',
  '+1-555-0101',
  'downtown@vizionmenu.com',
  '{"street": "123 Main St", "city": "Istanbul", "state": "Istanbul", "postal_code": "34000", "country": "Turkey"}',
  true
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440001',
  'Mall Branch',
  'mall',
  '+1-555-0102',
  'mall@vizionmenu.com',
  '{"street": "456 Mall Ave", "city": "Istanbul", "state": "Istanbul", "postal_code": "34100", "country": "Turkey"}',
  true
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440001',
  'Airport Branch',
  'airport',
  '+1-555-0103',
  'airport@vizionmenu.com',
  '{"street": "789 Airport Rd", "city": "Istanbul", "state": "Istanbul", "postal_code": "34200", "country": "Turkey"}',
  true
) ON CONFLICT (chain_id, slug) DO NOTHING;

-- Test Menu Categories
INSERT INTO menu_categories (branch_id, name, description, display_order, is_active) VALUES
-- Downtown Branch Categories
('550e8400-e29b-41d4-a716-446655440002', 'Appetizers', 'Start your meal right', 1, true),
('550e8400-e29b-41d4-a716-446655440002', 'Main Courses', 'Our signature dishes', 2, true),
('550e8400-e29b-41d4-a716-446655440002', 'Desserts', 'Sweet endings', 3, true),
-- Mall Branch Categories  
('550e8400-e29b-41d4-a716-446655440003', 'Fast Food', 'Quick bites', 1, true),
('550e8400-e29b-41d4-a716-446655440003', 'Beverages', 'Drinks and more', 2, true),
-- Airport Branch Categories
('550e8400-e29b-41d4-a716-446655440004', 'Travel Snacks', 'Perfect for travel', 1, true),
('550e8400-e29b-41d4-a716-446655440004', 'Coffee & Tea', 'Energy boosters', 2, true)
ON CONFLICT DO NOTHING;

-- Test Branch Users (Replace with your actual user IDs)
-- Example: Admin kullanıcısını chain_owner olarak ekle
/*
INSERT INTO branch_users (user_id, branch_id, role, permissions, is_active) VALUES
('ccc128a8-bc0f-4754-a558-6a083992dac3', '550e8400-e29b-41d4-a716-446655440002', 'chain_owner', '{"user_management", "menu_management", "order_management", "reports"}', true),
('cc62c21c-d2fb-4313-80ca-5262bcf23e42', '550e8400-e29b-41d4-a716-446655440002', 'branch_manager', '{"user_management", "menu_management", "order_management"}', true)
ON CONFLICT (user_id, branch_id) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
*/

-- =====================================================
-- SECTION 9: VERIFICATION QUERIES (Optional)
-- =====================================================

-- Check all tables created
/*
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_profiles', 'restaurant_chains', 'branches', 'branch_users',
  'menu_categories', 'menu_items', 'menu_item_variants',
  'orders', 'order_items', 'order_item_variants'
)
ORDER BY table_name;
*/

-- Test function
-- SELECT public.get_user_branch_info('YOUR-USER-ID-HERE');

-- View all test data
/*
SELECT 
  rc.name as chain_name,
  b.name as branch_name,
  bu.role,
  up.full_name,
  up.user_id
FROM restaurant_chains rc
JOIN branches b ON b.chain_id = rc.id
LEFT JOIN branch_users bu ON bu.branch_id = b.id
LEFT JOIN user_profiles up ON up.user_id = bu.user_id
ORDER BY rc.name, b.name, bu.role;
*/

-- =====================================================
-- IMPORTANT NOTES FOR SUPABASE
-- =====================================================
/*
1. AUTH SCHEMA FUNCTIONS:
   Supabase'de auth schema'sına doğrudan erişim yoktur. 
   auth.get_user_claims fonksiyonu yerine public.get_user_branch_info kullanın.

2. AUTH TRIGGER:
   auth.users tablosuna trigger eklemek için Supabase Dashboard kullanın:
   - Database > Functions > Create Function (handle_new_user)
   - Database > Triggers > Create Trigger (on_auth_user_created)
   
   VEYA Database Webhooks kullanın:
   - Database > Webhooks > Create Webhook
   - Table: auth.users
   - Events: INSERT
   - HTTP Request yaparak user_profiles tablosunu güncelleyin

3. TESTING:
   Test kullanıcıları için:
   - Authentication > Users > Invite User
   - Veya Authentication Settings'den Sign Up'ı aktif edin

4. RLS POLICIES:
   Tüm RLS politikaları auth.uid() kullanır ve otomatik çalışır.

5. PERMISSIONS:
   Eğer hala permission hatası alırsanız, bu SQL'i service_role key ile
   veya Supabase Dashboard SQL Editor'de çalıştırın.
*/