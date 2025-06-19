-- Tạo bảng thành viên dự án
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'manager', 'member', 'viewer'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Bật RLS cho projects và project_members
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Policy: Chỉ thành viên dự án được SELECT project
CREATE POLICY "Project members can select"
  ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = auth.uid()
    )
  );

-- Policy: Chỉ manager được UPDATE/DELETE project
CREATE POLICY "Project manager can update"
  ON projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = auth.uid() AND role = 'manager'
    )
  );
CREATE POLICY "Project manager can delete"
  ON projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = auth.uid() AND role = 'manager'
    )
  );

-- Policy: Ai cũng có thể thêm chính mình vào project_members (tùy chỉnh nếu cần)
CREATE POLICY "Self can insert project_members"
  ON project_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- Policy: Chỉ manager của project đó được thêm/xóa bất kỳ thành viên nào
CREATE POLICY "Project manager can manage members"
  ON project_members
  FOR INSERT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_members.project_id
        AND user_id = auth.uid()
        AND role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_members.project_id
        AND user_id = auth.uid()
        AND role = 'manager'
    )
  );

CREATE POLICY "Project manager can delete members"
  ON project_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_members.project_id
        AND user_id = auth.uid()
        AND role = 'manager'
    )
  );

-- Cho phép thành viên tự xóa mình khỏi dự án
CREATE POLICY "Self can delete self from project_members"
  ON project_members
  FOR DELETE
  USING (
    user_id = auth.uid()
  );