-- Vô hiệu hóa RLS hiện tại cho bảng projects
DROP POLICY IF EXISTS "Admins can do anything with projects" ON projects;
DROP POLICY IF EXISTS "Users can view projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects" ON projects;

-- Tạo chính sách mới cho bảng projects
-- Cho phép tất cả người dùng đã xác thực xem dự án
CREATE POLICY "Users can view projects" 
ON projects FOR SELECT 
TO authenticated 
USING (true);

-- Cho phép tất cả người dùng đã xác thực tạo dự án
CREATE POLICY "Users can create projects" 
ON projects FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Cho phép người dùng cập nhật dự án (có thể thêm điều kiện nếu cần)
CREATE POLICY "Users can update projects" 
ON projects FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Cho phép người dùng xóa dự án (có thể thêm điều kiện nếu cần)
CREATE POLICY "Users can delete projects" 
ON projects FOR DELETE 
TO authenticated 
USING (true);
