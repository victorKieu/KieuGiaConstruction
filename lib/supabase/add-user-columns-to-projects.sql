-- Thêm cột created_by và updated_by vào bảng projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Tạo index để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_updated_by ON projects(updated_by);
