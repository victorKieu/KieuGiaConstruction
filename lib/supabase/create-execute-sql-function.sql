-- Tạo hàm để thực thi SQL động
CREATE OR REPLACE FUNCTION execute_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Cấp quyền thực thi cho authenticated users
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;
