-- 既存のユーザーを確認
SELECT COUNT(*) FROM users WHERE username = 'admin';

-- adminユーザーが存在しない場合は作成
INSERT INTO users (username, email, full_name, password, role, is_approved, created_at, updated_at)
SELECT 'admin', 'admin@example.com', '管理者', '$2a$10$K0hyQ9BkYVhVcD0iO5XrGOQ1PfC3hD6QJm1uSvl6NbOQb.0za8Ttu', 'admin', true, NOW(), NOW()
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 既存のユーザーのタイムスタンプを修正（既に存在する場合）
UPDATE users
SET updated_at = NOW(), created_at = NOW()
WHERE username = 'admin' AND (updated_at IS NULL OR created_at IS NULL);

-- 作成されたユーザーを確認
SELECT id, username, role, is_approved, created_at, updated_at FROM users WHERE username = 'admin';