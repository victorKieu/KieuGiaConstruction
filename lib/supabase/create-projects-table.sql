-- Tạo bảng projects nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  project_type TEXT,
  construction_type TEXT,
  risk_level TEXT DEFAULT 'normal',
  project_manager TEXT,
  customer_id UUID REFERENCES customers(id),
  progress INTEGER DEFAULT 0,
  budget NUMERIC DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo index để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Thiết lập Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho SELECT
DROP POLICY IF EXISTS projects_select_policy ON projects;
CREATE POLICY projects_select_policy ON projects
  FOR SELECT
  USING (true);

-- Tạo policy cho INSERT
DROP POLICY IF EXISTS projects_insert_policy ON projects;
CREATE POLICY projects_insert_policy ON projects
  FOR INSERT
  WITH CHECK (true);

-- Tạo policy cho UPDATE
DROP POLICY IF EXISTS projects_update_policy ON projects;
CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (true);

-- Tạo policy cho DELETE
DROP POLICY IF EXISTS projects_delete_policy ON projects;
CREATE POLICY projects_delete_policy ON projects
  FOR DELETE
  USING (true);
