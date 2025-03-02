#!/bin/sh

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
until nc -z db 3306; do
  sleep 1
done

echo "MySQL is ready! Setting up database..."

# データベースの状態を確認
echo "Checking database status..."
mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SHOW TABLES;" || {
  echo "Error checking database status. This is normal for first run."
}

# データベースの詳細な状態を確認
echo "Checking database tables..."
mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SHOW TABLES;" || {
  echo "Error: Cannot show tables. Database might not be ready."
}

# Prismaのマイグレーションを実行
echo "Running Prisma migrations..."
npx prisma generate
npx prisma db push --accept-data-loss

# シードスクリプトを実行してユーザーを作成
echo "Running seed script to create users..."
npm run seed

# データベースの状態を再確認
echo "Verifying database setup after seeding..."

# ユーザー数を確認
USER_COUNT=$(mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SELECT COUNT(*) FROM users;" 2>/dev/null | tail -n 1)
echo "Current user count after seeding: $USER_COUNT"

# adminユーザーの存在を確認
ADMIN_EXISTS=$(mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SELECT COUNT(*) FROM users WHERE username='admin';" 2>/dev/null | tail -n 1)
echo "Admin user exists: $ADMIN_EXISTS"

# adminユーザーが存在しない場合は手動で作成を試みる
if [ "$ADMIN_EXISTS" = "0" ] || [ -z "$ADMIN_EXISTS" ]; then
  echo "WARNING: Admin user not found after seeding. Attempting manual creation..."
  
  # 管理者ユーザーを作成（パスワード: admin123）
  mysql -h db -u root -pp0ssw0rd -e "USE psyexam; INSERT INTO users (username, email, full_name, password, role, is_approved) VALUES ('admin', 'admin@example.com', '管理者', '\$2a\$10\$K0hyQ9BkYVhVcD0iO5XrGOQ1PfC3hD6QJm1uSvl6NbOQb.0za8Ttu', 'admin', true);"
  
  # 作成確認
  ADMIN_CHECK=$(mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SELECT id, username, role, is_approved FROM users WHERE username='admin';" 2>/dev/null)
  echo "Manual admin user creation result: $ADMIN_CHECK"
else
  echo "Admin user exists in the database after seeding."
  
  # 既存の管理者ユーザーの詳細を表示
  ADMIN_DETAILS=$(mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SELECT id, username, role, is_approved FROM users WHERE username='admin';" 2>/dev/null)
  echo "Existing admin user details: $ADMIN_DETAILS"
fi

# 全ユーザーリストを表示
echo "All users in database:"
mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SELECT id, username, role, is_approved FROM users;" 2>/dev/null

echo "Database setup complete!"

# アプリケーションを起動
echo "Starting application..."
exec npm run dev
