-- Thiết lập Row Level Security (RLS) cho các bảng

-- Bật RLS cho tất cả các bảng
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Tạo các hàm hỗ trợ kiểm tra quyền
CREATE OR REPLACE FUNCTION public.user_has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_permission BOOLEAN;
BEGIN
  -- Lấy vai trò của người dùng hiện tại
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  
  -- Admin luôn có tất cả các quyền
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Kiểm tra quyền từ vai trò
  SELECT EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = auth.uid() AND p.code = permission_code
  ) INTO has_permission;
  
  IF has_permission THEN
    RETURN TRUE;
  END IF;
  
  -- Kiểm tra quyền trực tiếp của người dùng
  SELECT EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = auth.uid() AND p.code = permission_code
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo các chính sách RLS cho từng bảng

-- Chính sách cho bảng projects
CREATE POLICY "Admins can do anything with projects" 
ON projects FOR ALL 
TO authenticated 
USING (user_has_permission('project:view'))
WITH CHECK (user_has_permission('project:create') OR user_has_permission('project:update'));

-- Chính sách cho bảng employees
CREATE POLICY "Admins and HR can view employees" 
ON employees FOR SELECT 
TO authenticated 
USING (user_has_permission('employee:view'));

CREATE POLICY "Admins and HR can create employees" 
ON employees FOR INSERT 
TO authenticated 
WITH CHECK (user_has_permission('employee:create'));

CREATE POLICY "Admins and HR can update employees" 
ON employees FOR UPDATE 
TO authenticated 
USING (user_has_permission('employee:update'))
WITH CHECK (user_has_permission('employee:update'));

CREATE POLICY "Admins and HR can delete employees" 
ON employees FOR DELETE 
TO authenticated 
USING (user_has_permission('employee:delete'));

-- Chính sách cho bảng customers
CREATE POLICY "Authorized users can view customers" 
ON customers FOR SELECT 
TO authenticated 
USING (user_has_permission('customer:view'));

CREATE POLICY "Authorized users can create customers" 
ON customers FOR INSERT 
TO authenticated 
WITH CHECK (user_has_permission('customer:create'));

CREATE POLICY "Authorized users can update customers" 
ON customers FOR UPDATE 
TO authenticated 
USING (user_has_permission('customer:update'))
WITH CHECK (user_has_permission('customer:update'));

CREATE POLICY "Authorized users can delete customers" 
ON customers FOR DELETE 
TO authenticated 
USING (user_has_permission('customer:delete'));

-- Chính sách cho bảng users
CREATE POLICY "Users can view their own profile" 
ON users FOR SELECT 
TO authenticated 
USING (id = auth.uid() OR user_has_permission('permission:view'));

CREATE POLICY "Only admins can create users" 
ON users FOR INSERT 
TO authenticated 
WITH CHECK (user_has_permission('permission:create'));

CREATE POLICY "Users can update their own profile or admins can update any" 
ON users FOR UPDATE 
TO authenticated 
USING (id = auth.uid() OR user_has_permission('permission:update'))
WITH CHECK (id = auth.uid() OR user_has_permission('permission:update'));

-- Chính sách cho bảng permissions
CREATE POLICY "Only admins can manage permissions" 
ON permissions FOR ALL 
TO authenticated 
USING (user_has_permission('permission:view'))
WITH CHECK (user_has_permission('permission:create') OR user_has_permission('permission:update'));

-- Chính sách cho bảng roles
CREATE POLICY "Only admins can manage roles" 
ON roles FOR ALL 
TO authenticated 
USING (user_has_permission('permission:view'))
WITH CHECK (user_has_permission('permission:create') OR user_has_permission('permission:update'));

-- Chính sách cho bảng role_permissions
CREATE POLICY "Only admins can manage role permissions" 
ON role_permissions FOR ALL 
TO authenticated 
USING (user_has_permission('permission:view'))
WITH CHECK (user_has_permission('permission:create') OR user_has_permission('permission:update'));

-- Chính sách cho bảng user_permissions
CREATE POLICY "Only admins can manage user permissions" 
ON user_permissions FOR ALL 
TO authenticated 
USING (user_has_permission('permission:view'))
WITH CHECK (user_has_permission('permission:create') OR user_has_permission('permission:update'));

-- Chính sách cho bảng user_roles
CREATE POLICY "Only admins can manage user roles" 
ON user_roles FOR ALL 
TO authenticated 
USING (user_has_permission('permission:view'))
WITH CHECK (user_has_permission('permission:create') OR user_has_permission('permission:update'));

-- Chính sách cho bảng notifications
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR user_has_permission('permission:view'));

CREATE POLICY "System can create notifications" 
ON notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid() OR user_has_permission('permission:update'))
WITH CHECK (user_id = auth.uid() OR user_has_permission('permission:update'));

-- Chính sách cho bảng report_templates
CREATE POLICY "Authorized users can view report templates" 
ON report_templates FOR SELECT 
TO authenticated 
USING (user_has_permission('report:view'));

CREATE POLICY "Authorized users can create report templates" 
ON report_templates FOR INSERT 
TO authenticated 
WITH CHECK (user_has_permission('report:create'));

CREATE POLICY "Authorized users can update report templates" 
ON report_templates FOR UPDATE 
TO authenticated 
USING (user_has_permission('report:view'))
WITH CHECK (user_has_permission('report:create'));

-- Chính sách cho bảng reports
CREATE POLICY "Authorized users can view reports" 
ON reports FOR SELECT 
TO authenticated 
USING (created_by = auth.uid() OR user_has_permission('report:view'));

CREATE POLICY "Authorized users can create reports" 
ON reports FOR INSERT 
TO authenticated 
WITH CHECK (user_has_permission('report:create'));

CREATE POLICY "Authorized users can update their own reports" 
ON reports FOR UPDATE 
TO authenticated 
USING (created_by = auth.uid() OR user_has_permission('report:create'))
WITH CHECK (created_by = auth.uid() OR user_has_permission('report:create'));

-- Chính sách cho bảng activity_logs
CREATE POLICY "Authorized users can view activity logs" 
ON activity_logs FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR user_has_permission('permission:view'));

CREATE POLICY "System can create activity logs" 
ON activity_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);
