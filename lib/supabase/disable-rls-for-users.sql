-- Tạm thời vô hiệu hóa RLS cho bảng users để giải quyết vấn đề
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Tạo lại hàm create_user với quyền cao hơn
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
