-- Tạo hàm RPC để bypass RLS khi tạo dự án
CREATE OR REPLACE FUNCTION create_project_bypass_rls(
  project_data JSONB
) RETURNS JSONB AS $$
DECLARE
  new_project JSONB;
  project_id UUID;
BEGIN
  -- Chèn dự án mới và lấy ID
  INSERT INTO projects (
    name, 
    code, 
    description, 
    location, 
    status, 
    project_type, 
    construction_type,
    risk_level, 
    project_manager, 
    customer_id, 
    progress, 
    budget, 
    start_date, 
    end_date, 
    created_at, 
    updated_at
  ) VALUES (
    project_data->>'name',
    project_data->>'code',
    project_data->>'description',
    project_data->>'location',
    project_data->>'status',
    project_data->>'project_type',
    project_data->>'construction_type',
    project_data->>'risk_level',
    project_data->>'project_manager',
    (project_data->>'customer_id')::UUID,
    (project_data->>'progress')::INT,
    (project_data->>'budget')::NUMERIC,
    (project_data->>'start_date')::TIMESTAMP,
    (project_data->>'end_date')::TIMESTAMP,
    COALESCE((project_data->>'created_at')::TIMESTAMP, NOW()),
    COALESCE((project_data->>'updated_at')::TIMESTAMP, NOW())
  ) RETURNING id INTO project_id;
  
  -- Lấy dự án vừa tạo
  SELECT row_to_json(p)::JSONB INTO new_project
  FROM projects p
  WHERE p.id = project_id;
  
  RETURN new_project;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cấp quyền thực thi hàm cho authenticated users
GRANT EXECUTE ON FUNCTION create_project_bypass_rls TO authenticated;
