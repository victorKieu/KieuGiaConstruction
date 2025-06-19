-- Tạo hàm để thêm người dùng mới vào bảng users
-- Hàm này sẽ được gọi thông qua RPC và bypass RLS
CREATE OR REPLACE FUNCTION create_user(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  user_status TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, status)
  VALUES (user_id, user_email, user_name, user_role, user_status)
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cấp quyền thực thi hàm cho authenticated users
GRANT EXECUTE ON FUNCTION create_user TO authenticated;
