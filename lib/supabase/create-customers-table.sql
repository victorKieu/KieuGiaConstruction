-- Tạo bảng customers nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  contact_person VARCHAR(255),
  tax_code VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo index để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Thiết lập Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho phép đọc dữ liệu
CREATE POLICY customers_select_policy ON customers
  FOR SELECT USING (true);

-- Tạo policy cho phép thêm dữ liệu
CREATE POLICY customers_insert_policy ON customers
  FOR INSERT WITH CHECK (true);

-- Tạo policy cho phép cập nhật dữ liệu
CREATE POLICY customers_update_policy ON customers
  FOR UPDATE USING (true);

-- Tạo policy cho phép xóa dữ liệu
CREATE POLICY customers_delete_policy ON customers
  FOR DELETE USING (true);

-- Thêm một số dữ liệu mẫu
INSERT INTO customers (name, code, email, phone, address, contact_person)
VALUES
  ('Công ty TNHH Xây dựng ABC', 'ABC', 'contact@abc.com', '0901234567', 'Hà Nội', 'Nguyễn Văn A'),
  ('Tập đoàn Bất động sản XYZ', 'XYZ', 'info@xyz.com', '0909876543', 'TP. Hồ Chí Minh', 'Trần Thị B'),
  ('Công ty Cổ phần Đầu tư DEF', 'DEF', 'info@def.com', '0912345678', 'Đà Nẵng', 'Lê Văn C')
ON CONFLICT (code) DO NOTHING;
