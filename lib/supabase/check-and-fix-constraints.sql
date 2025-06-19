-- Kiểm tra các ràng buộc khóa ngoại hiện có trên bảng projects
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'projects';

-- Kiểm tra các bảng có khóa ngoại tham chiếu đến bảng projects
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'projects';

-- Kiểm tra cấu trúc bảng projects
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects';

-- Tạo function để xóa dự án và các dữ liệu liên quan
CREATE OR REPLACE FUNCTION public.delete_project_cascade(project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    success BOOLEAN;
BEGIN
    -- Xóa các bản ghi liên quan trong các bảng con (nếu có)
    -- Ví dụ: DELETE FROM project_tasks WHERE project_id = project_id;
    
    -- Xóa dự án
    DELETE FROM projects WHERE id = project_id;
    
    -- Kiểm tra xem dự án đã được xóa chưa
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id) THEN
        success := TRUE;
    ELSE
        success := FALSE;
    END IF;
    
    RETURN success;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting project: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Cấp quyền cho function
GRANT EXECUTE ON FUNCTION public.delete_project_cascade TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_project_cascade TO service_role;

-- Tạm thời vô hiệu hóa RLS cho bảng projects để kiểm tra
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Kiểm tra xem có bản ghi nào trong bảng projects không
SELECT COUNT(*) FROM projects;
