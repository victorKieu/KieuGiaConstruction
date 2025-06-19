-- Kiểm tra và sửa các foreign key trong bảng activity_logs
DO $$
BEGIN
  -- Kiểm tra xem foreign key đã tồn tại chưa
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'activity_logs_user_id_fkey' 
    AND table_name = 'activity_logs'
  ) THEN
    -- Thêm foreign key nếu chưa tồn tại
    BEGIN
      ALTER TABLE activity_logs
      ADD CONSTRAINT activity_logs_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Không thể thêm foreign key: %', SQLERRM;
    END;
  END IF;
END
$$;

-- Kiểm tra và sửa các foreign key trong bảng user_permissions
DO $$
BEGIN
  -- Kiểm tra xem foreign key đã tồn tại chưa
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_permissions_user_id_fkey' 
    AND table_name = 'user_permissions'
  ) THEN
    -- Thêm foreign key nếu chưa tồn tại
    BEGIN
      ALTER TABLE user_permissions
      ADD CONSTRAINT user_permissions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Không thể thêm foreign key: %', SQLERRM;
    END;
  END IF;
END
$$;

-- Kiểm tra và sửa các foreign key trong bảng user_roles
DO $$
BEGIN
  -- Kiểm tra xem foreign key đã tồn tại chưa
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_user_id_fkey' 
    AND table_name = 'user_roles'
  ) THEN
    -- Thêm foreign key nếu chưa tồn tại
    BEGIN
      ALTER TABLE user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Không thể thêm foreign key: %', SQLERRM;
    END;
  END IF;
END
$$;
