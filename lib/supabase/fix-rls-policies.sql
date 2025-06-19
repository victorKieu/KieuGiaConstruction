-- Xóa chính sách hiện tại cho bảng users nếu có
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Only admins can create users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile or admins can update any" ON users;

-- Tạo chính sách mới cho bảng users
-- Cho phép người dùng xem thông tin của chính họ hoặc admin có thể xem tất cả
CREATE POLICY "Users can view their own profile or admins can view all"
ON users FOR SELECT
TO authenticated
USING (id = auth.uid() OR EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
));

-- Chỉ admin mới có thể tạo người dùng mới thông qua UI
-- Người dùng mới sẽ được tạo thông qua API route với service role
CREATE POLICY "Only admins can create users"
ON users FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
));

-- Người dùng có thể cập nhật thông tin của chính họ hoặc admin có thể cập nhật bất kỳ ai
CREATE POLICY "Users can update their own profile or admins can update any"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid() OR EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
))
WITH CHECK (id = auth.uid() OR EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
));
