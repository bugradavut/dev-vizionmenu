Vizion Multi-Tenant Restaurant Ordering System:
-- Vizion Menu - Multi-Branch Restaurant Ordering System
-- Updated for Chain → Branch → Users hierarchy

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- User Profiles Table (extends Supabase auth.users)
-- =====================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Restaurant Chains (Multi-brand support)
-- =====================================================
CREATE TABLE restaurant_chains (
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

-- =====================================================
-- Branches (Individual restaurant locations)
-- =====================================================
CREATE TABLE branches (
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

-- =====================================================
-- Branch Users (Multi-branch user management)
-- =====================================================
CREATE TABLE branch_users (
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

-- =====================================================
-- Menu Categories (Branch-specific)
-- =====================================================
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Menu Items (Branch-specific)
-- =====================================================
CREATE TABLE menu_items (
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

-- =====================================================
-- Menu Item Variants
-- =====================================================
CREATE TABLE menu_item_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Orders (Branch-specific)
-- =====================================================
CREATE TABLE orders (
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

-- =====================================================
-- Order Items
-- =====================================================
CREATE TABLE order_items (
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

-- =====================================================
-- Order Item Variants
-- =====================================================
CREATE TABLE order_item_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- JWT Claims Function (Multi-branch support)
-- =====================================================
CREATE OR REPLACE FUNCTION auth.get_user_claims(user_id UUID)
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

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_restaurant_chains_slug ON restaurant_chains(slug);
CREATE INDEX idx_branches_chain_id ON branches(chain_id);
CREATE INDEX idx_branches_slug ON branches(chain_id, slug);
CREATE INDEX idx_branch_users_user_id ON branch_users(user_id);
CREATE INDEX idx_branch_users_branch_id ON branch_users(branch_id);
CREATE INDEX idx_menu_categories_branch_id ON menu_categories(branch_id);
CREATE INDEX idx_menu_items_branch_id ON menu_items(branch_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================
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
CREATE POLICY "Users can access own profile" ON user_profiles
FOR ALL USING (auth.uid() = user_id);

-- Restaurant Chains: Public read, chain owners can manage
CREATE POLICY "Public can read chains" ON restaurant_chains
FOR SELECT USING (is_active = true);

CREATE POLICY "Chain owners can manage chains" ON restaurant_chains
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users bu 
  JOIN branches b ON b.id = bu.branch_id 
  WHERE b.chain_id = restaurant_chains.id 
  AND bu.user_id = auth.uid() 
  AND bu.role = 'chain_owner'
));

-- Branches: Public read, branch users can access
CREATE POLICY "Public can read branches" ON branches
FOR SELECT USING (is_active = true);

CREATE POLICY "Branch users can access branches" ON branches
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = branches.id 
  AND branch_users.user_id = auth.uid()
));

-- Branch Users: Branch managers and chain owners can manage
CREATE POLICY "Branch managers can manage users" ON branch_users
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users bu 
  WHERE bu.branch_id = branch_users.branch_id 
  AND bu.user_id = auth.uid() 
  AND bu.role IN ('chain_owner', 'branch_manager')
));

-- Menu Categories: Public read, branch staff can manage
CREATE POLICY "Public can read menu categories" ON menu_categories
FOR SELECT USING (is_active = true);

CREATE POLICY "Branch staff can manage categories" ON menu_categories
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = menu_categories.branch_id 
  AND branch_users.user_id = auth.uid()
));

-- Menu Items: Public read, branch staff can manage
CREATE POLICY "Public can read menu items" ON menu_items
FOR SELECT USING (is_available = true);

CREATE POLICY "Branch staff can manage menu items" ON menu_items
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = menu_items.branch_id 
  AND branch_users.user_id = auth.uid()
));

-- Orders: Branch staff can access orders
CREATE POLICY "Branch staff can access orders" ON orders
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users 
  WHERE branch_users.branch_id = orders.branch_id 
  AND branch_users.user_id = auth.uid()
));

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_chains_updated_at BEFORE UPDATE ON restaurant_chains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branch_users_updated_at BEFORE UPDATE ON branch_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Auth Trigger (auth.users → user_profiles sync)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



Restaurant Chain Management System:
-- =====================================================
-- NEW: Restaurant Chains (Multi-brand support)
-- =====================================================
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

-- =====================================================
-- NEW: Branches (Individual restaurant locations)
-- =====================================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain_id UUID REFERENCES restaurant_chains(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  email TEXT,
  address JSONB,
  location POINT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chain_id, slug)
);

-- =====================================================
-- NEW: Branch Users (Multi-branch user management)
-- =====================================================
CREATE TABLE IF NOT EXISTS branch_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'branch_staff',
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

-- =====================================================
-- UPDATE: Menu Categories (Add branch_id)
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'menu_categories' AND column_name = 'branch_id') THEN
    ALTER TABLE menu_categories ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- UPDATE: Menu Items (Change restaurant_id to branch_id)
-- =====================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'menu_items' AND column_name = 'restaurant_id') THEN
    ALTER TABLE menu_items RENAME COLUMN restaurant_id TO branch_id;
  END IF;
END $$;

-- =====================================================
-- UPDATE: Orders (Change restaurant_id to branch_id)
-- =====================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'orders' AND column_name = 'restaurant_id') THEN
    ALTER TABLE orders RENAME COLUMN restaurant_id TO branch_id;
  END IF;
END $$;

-- =====================================================
-- NEW: Helper function for getting user claims (public schema)
-- =====================================================
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

-- =====================================================
-- NEW: Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_restaurant_chains_slug ON restaurant_chains(slug);
CREATE INDEX IF NOT EXISTS idx_branches_chain_id ON branches(chain_id);
CREATE INDEX IF NOT EXISTS idx_branches_slug ON branches(chain_id, slug);
CREATE INDEX IF NOT EXISTS idx_branch_users_user_id ON branch_users(user_id);
CREATE INDEX IF NOT EXISTS idx_branch_users_branch_id ON branch_users(branch_id);

-- =====================================================
-- UPDATE: RLS Policies for new tables
-- =====================================================
ALTER TABLE restaurant_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_users ENABLE ROW LEVEL SECURITY;

-- Restaurant Chains policies
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

-- Branches policies
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

-- Branch Users policies
DROP POLICY IF EXISTS "Branch managers can manage users" ON branch_users;
CREATE POLICY "Branch managers can manage users" ON branch_users
FOR ALL USING (EXISTS (
  SELECT 1 FROM branch_users bu 
  WHERE bu.branch_id = branch_users.branch_id 
  AND bu.user_id = auth.uid() 
  AND bu.role IN ('chain_owner', 'branch_manager')
));

-- =====================================================
-- NEW: Triggers for new tables
-- =====================================================
CREATE TRIGGER update_restaurant_chains_updated_at 
  BEFORE UPDATE ON restaurant_chains 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at 
  BEFORE UPDATE ON branches 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branch_users_updated_at 
  BEFORE UPDATE ON branch_users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- UPDATE: Auth Trigger (if not exists)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


Restaurant Test Data Setup:
-- =====================================================
-- TEST DATA: Restaurant Chains, Branches, Users
-- =====================================================

-- 1. Test Restaurant Chain oluştur
INSERT INTO restaurant_chains (id, name, slug, description, logo_url, is_active) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'VizionMenu Test Chain',
  'vizionmenu-test',
  'Test restaurant chain for development',
  'https://example.com/logo.png',
  true
) ON CONFLICT (slug) DO NOTHING;

-- 2. Test Branches oluştur
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

-- 3. Test Users oluştur (manuel olarak auth.users'a ekleyeceğiz)
-- Bu kısım için Supabase Auth UI kullanacağız

-- 4. Test Menu Categories oluştur
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
('550e8400-e29b-41d4-a716-446655440004', 'Coffee & Tea', 'Energy boosters', 2, true);

-- 5. Test function çalışıyor mu kontrol et
SELECT public.get_user_branch_info('00000000-0000-0000-0000-000000000000');


Branch User Assignment and Verification:
-- =====================================================
-- TEST DATA: Branch Users (User-Branch İlişkileri)
-- =====================================================

-- Admin kullanıcısını chain_owner olarak ekle (tüm şubelere erişim)
INSERT INTO branch_users (user_id, branch_id, role, permissions, is_active) VALUES
-- Admin -> Downtown Branch (chain_owner)
('ccc128a8-bc0f-4754-a558-6a083992dac3', '550e8400-e29b-41d4-a716-446655440002', 'chain_owner', '{"user_management", "menu_management", "order_management", "reports"}', true),

-- Manager kullanıcısını branch_manager olarak ekle (sadece Downtown Branch)
('cc62c21c-d2fb-4313-80ca-5262bcf23e42', '550e8400-e29b-41d4-a716-446655440002', 'branch_manager', '{"user_management", "menu_management", "order_management"}', true)

ON CONFLICT (user_id, branch_id) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Test: Function'ı tekrar çalıştır
SELECT 'Admin User Info:' as label, public.get_user_branch_info('ccc128a8-bc0f-4754-a558-6a083992dac3') as user_info
UNION ALL
SELECT 'Manager User Info:' as label, public.get_user_branch_info('cc62c21c-d2fb-4313-80ca-5262bcf23e42') as user_info;

-- Bonus: Tüm test verilerini kontrol et
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
