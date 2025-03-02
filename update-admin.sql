-- adminユーザーのパスワードを更新（admin123）
UPDATE users SET password = '$2b$10$RsBtfCDWG0kCG.3uniT9g.sCjg1.mxO76tpRNlNvKWDmnoesf6iMu' WHERE username = 'admin';

-- 更新を確認
SELECT id, username, password FROM users WHERE username = 'admin';