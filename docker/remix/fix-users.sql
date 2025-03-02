-- 既存のユーザーのタイムスタンプを修正
UPDATE users 
SET updated_at = NOW(), created_at = NOW() 
WHERE updated_at IS NULL OR created_at IS NULL OR updated_at = '0000-00-00 00:00:00' OR created_at = '0000-00-00 00:00:00';

-- ユーザーテーブルの状態を確認
SELECT id, username, role, is_approved, created_at, updated_at FROM users;