-- Tạo bảng project_logs nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS project_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo index để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS project_logs_project_id_idx ON project_logs(project_id);
CREATE INDEX IF NOT EXISTS project_logs_user_id_idx ON project_logs(user_id);
CREATE INDEX IF NOT EXISTS project_logs_action_idx ON project_logs(action);
CREATE INDEX IF NOT EXISTS project_logs_created_at_idx ON project_logs(created_at);

-- Thiết lập RLS
ALTER TABLE project_logs ENABLE ROW LEVEL SECURITY;

-- Xóa các policy hiện tại nếu có
DROP POLICY IF EXISTS "Allow select for authenticated users" ON project_logs;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON project_logs;

-- Tạo policy cho phép người dùng đã xác thực xem nhật ký
CREATE POLICY "Allow select for authenticated users"
  ON project_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Tạo policy cho phép người dùng đã xác thực thêm nhật ký
CREATE POLICY "Allow insert for authenticated users"
  ON project_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Tạo trigger function để tự động ghi nhật ký khi có thay đổi trong bảng projects
CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_id UUID;
  user_name TEXT;
  action_text TEXT;
  details_text TEXT;
BEGIN
  -- Lấy thông tin người dùng hiện tại
  user_id := auth.uid();
  SELECT email INTO user_name FROM auth.users WHERE id = user_id;
  
  IF user_name IS NULL THEN
    user_name := 'Hệ thống';
  END IF;
  
  -- Xác định hành động và chi tiết
  IF TG_OP = 'INSERT' THEN
    action_text := 'create';
    details_text := 'Đã tạo dự án mới: ' || NEW.name;
    
    -- Thêm nhật ký
    INSERT INTO project_logs (
      project_id, 
      project_name, 
      action, 
      user_id, 
      user_name, 
      details,
      metadata
    ) VALUES (
      NEW.id,
      NEW.name,
      action_text,
      user_id,
      user_name,
      details_text,
      jsonb_build_object('project', row_to_json(NEW))
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    action_text := 'update';
    details_text := 'Đã cập nhật dự án: ' || NEW.name;
    
    -- Thêm nhật ký
    INSERT INTO project_logs (
      project_id, 
      project_name, 
      action, 
      user_id, 
      user_name, 
      details,
      metadata
    ) VALUES (
      NEW.id,
      NEW.name,
      action_text,
      user_id,
      user_name,
      details_text,
      jsonb_build_object(
        'old', row_to_json(OLD),
        'new', row_to_json(NEW),
        'changes', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(to_jsonb(NEW) - to_jsonb(OLD))
        )
      )
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    action_text := 'delete';
    details_text := 'Đã xóa dự án: ' || OLD.name;
    
    -- Thêm nhật ký
    INSERT INTO project_logs (
      project_id, 
      project_name, 
      action, 
      user_id, 
      user_name, 
      details,
      metadata
    ) VALUES (
      OLD.id,
      OLD.name,
      action_text,
      user_id,
      user_name,
      details_text,
      jsonb_build_object('project', row_to_json(OLD))
    );
  END IF;
  
  -- Trả về giá trị phù hợp với loại trigger
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo trigger cho bảng projects
DROP TRIGGER IF EXISTS projects_audit_trigger ON projects;

CREATE TRIGGER projects_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION log_project_changes();
