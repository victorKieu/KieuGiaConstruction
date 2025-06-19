-- Tạo function để xóa dự án với quyền admin
CREATE OR REPLACE FUNCTION delete_project_admin(project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Chạy với quyền của người tạo function (thường là admin)
AS $$
DECLARE
  success BOOLEAN;
BEGIN
  -- Xóa dự án với ID được cung cấp
  DELETE FROM projects WHERE id = project_id;
  
  -- Kiểm tra xem dự án đã được xóa chưa
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id) THEN
    success := TRUE;
  ELSE
    success := FALSE;
  END IF;
  
  RETURN success;
END;
$$;

-- Cấp quyền cho authenticated users
GRANT EXECUTE ON FUNCTION delete_project_admin TO authenticated;
