-- Tạo hàm để thêm dự án mới với SECURITY DEFINER để bypass RLS
CREATE OR REPLACE FUNCTION insert_project(project_data JSONB, user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Chạy với quyền của người tạo hàm (thường là admin)
AS $$
DECLARE
  new_project JSONB;
  inserted_id UUID;
BEGIN
  -- Thêm thông tin người tạo và thời gian
  project_data := project_data || jsonb_build_object(
    'created_by', user_id,
    'created_at', CURRENT_TIMESTAMP,
    'updated_at', CURRENT_TIMESTAMP
  );
  
  -- Thêm dự án mới
  INSERT INTO projects
  SELECT * FROM jsonb_populate_record(null::projects, project_data)
  RETURNING id INTO inserted_id;
  
  -- Lấy dự án vừa thêm
  SELECT row_to_json(p)::jsonb INTO new_project
  FROM projects p
  WHERE p.id = inserted_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', new_project
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Cấp quyền thực thi hàm cho authenticated users
GRANT EXECUTE ON FUNCTION insert_project TO authenticated;
