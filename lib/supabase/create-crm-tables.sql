-- Tạo bảng contacts (người liên hệ)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Tạo bảng contracts (hợp đồng)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  value NUMERIC(15, 2) NOT NULL,
  start_date DATE,
  end_date DATE,
  signing_date DATE,
  status VARCHAR(50) DEFAULT 'draft',
  payment_terms TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Tạo bảng opportunities (cơ hội bán hàng)
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_value NUMERIC(15, 2),
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  stage VARCHAR(50) DEFAULT 'lead',
  source VARCHAR(100),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Tạo bảng activities (hoạt động tương tác với khách hàng)
CREATE TABLE IF NOT EXISTS customer_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  activity_date TIMESTAMP WITH TIME ZONE,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Tạo bảng payment_schedules (lịch thanh toán hợp đồng)
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  milestone VARCHAR(255),
  amount NUMERIC(15, 2) NOT NULL,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  payment_date DATE,
  payment_method VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Tạo bảng customer_tags (tags cho khách hàng)
CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo bảng customer_tag_relations (quan hệ nhiều-nhiều giữa khách hàng và tags)
CREATE TABLE IF NOT EXISTS customer_tag_relations (
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES customer_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, tag_id)
);

-- Tạo bảng customer_notes (ghi chú về khách hàng)
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Tạo các indexes để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activities_customer_id ON customer_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id ON payment_schedules(contract_id);

-- Thêm một số dữ liệu mẫu cho customer_tags
INSERT INTO customer_tags (name, color) VALUES
('VIP', '#F59E0B'),
('Tiềm năng', '#10B981'),
('Mới', '#3B82F6'),
('Thường xuyên', '#8B5CF6'),
('Không hoạt động', '#6B7280')
ON CONFLICT DO NOTHING;

-- Tạo trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger cho các bảng
DO $$
DECLARE
  tables TEXT[] := ARRAY['contacts', 'contracts', 'opportunities', 'customer_activities', 'payment_schedules', 'customer_notes'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_timestamp ON %I;
      CREATE TRIGGER update_timestamp
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    ', t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
