-- adminユーザーのパスワードを更新
UPDATE users 
SET password = '$2b$10$CneoRKtHeIZSF34216Gh/uN8JwTPzoaatpGckQJ29MMU0j0Ju1zAW' 
WHERE username = 'admin';