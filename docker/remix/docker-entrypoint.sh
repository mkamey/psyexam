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

# 既存のユーザーのタイムスタンプを修正
echo "Fixing existing users timestamps..."
if command -v mysql >/dev/null 2>&1; then
  mysql -h db -u root -pp0ssw0rd psyexam < /usr/server/fix-users.sql
  echo "User timestamps fixed."
else
  echo "MySQL client not found. Cannot fix user timestamps."
fi

# MySQLクライアントが利用可能か確認
if command -v mysql >/dev/null 2>&1; then
  echo "MySQL client is available. Creating admin user directly with SQL..."
  
  # 直接SQLを使用して管理者ユーザーを作成
  mysql -h db -u root -pp0ssw0rd psyexam < /usr/server/create-admin.sql
  
  # 作成結果を確認
  echo "Verifying admin user creation..."
  ADMIN_EXISTS=$(mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SELECT COUNT(*) FROM users WHERE username='admin';" 2>/dev/null | tail -n 1)
  echo "Admin user exists: $ADMIN_EXISTS"
  
  if [ "$ADMIN_EXISTS" = "0" ] || [ -z "$ADMIN_EXISTS" ]; then
    echo "ERROR: Failed to create admin user with SQL. Trying one more approach..."
    
    # 最後の手段として直接INSERTを実行（タイムスタンプを明示的に設定）
    mysql -h db -u root -pp0ssw0rd -e "USE psyexam; INSERT IGNORE INTO users (username, email, full_name, password, role, is_approved, created_at, updated_at) VALUES ('admin', 'admin@example.com', '管理者', '\$2a\$10\$K0hyQ9BkYVhVcD0iO5XrGOQ1PfC3hD6QJm1uSvl6NbOQb.0za8Ttu', 'admin', true, NOW(), NOW());"
    
    # 既存のユーザーのタイムスタンプを修正（既に存在する場合）
    mysql -h db -u root -pp0ssw0rd -e "USE psyexam; UPDATE users SET updated_at = NOW(), created_at = NOW() WHERE username = 'admin' AND (updated_at IS NULL OR created_at IS NULL);"
    
    # 再度確認
    ADMIN_RECHECK=$(mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SELECT COUNT(*) FROM users WHERE username='admin';" 2>/dev/null | tail -n 1)
    echo "Admin user after direct INSERT: $ADMIN_RECHECK"
    
    if [ "$ADMIN_RECHECK" = "0" ] || [ -z "$ADMIN_RECHECK" ]; then
      echo "CRITICAL ERROR: Failed to create admin user after multiple attempts!"
    else
      echo "Admin user created successfully on second attempt!"
      
      # ユーザー詳細を表示
      echo "Admin user details:"
      mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SELECT id, username, role, is_approved FROM users WHERE username='admin';"
    fi
  else
    echo "Admin user created successfully on first attempt!"
    
    # ユーザー詳細を表示
    echo "Admin user details:"
    mysql -h db -u root -pp0ssw0rd -e "USE psyexam; SELECT id, username, role, is_approved FROM users WHERE username='admin';"
  fi
else
  echo "MySQL client not found. Using Prisma to create admin user..."
  
  # Prismaを使用してユーザーを作成するスクリプト
  cat > /tmp/create-admin-prisma.js << EOF
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('Creating admin user with Prisma...');
  
  try {
    // 既存のユーザーを確認
    const userCount = await prisma.user.count();
    console.log(\`Current user count: \${userCount}\`);
    
    // adminユーザーが存在するか確認
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.id);
      return true;
    }
    
    // 管理者ユーザーを作成（タイムスタンプを明示的に設定）
    const now = new Date();
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        fullName: '管理者',
        password: '\$2a\$10\$K0hyQ9BkYVhVcD0iO5XrGOQ1PfC3hD6QJm1uSvl6NbOQb.0za8Ttu', // admin123
        role: 'admin',
        isApproved: true,
        createdAt: now,
        updatedAt: now
      }
    });
    
    console.log('Admin user created successfully:', adminUser.id);
    return true;
  } catch (error) {
    console.error('Failed to create admin user:', error);
    return false;
  } finally {
    await prisma.\$disconnect();
  }
}

createAdminUser()
  .then(success => {
    if (success) {
      console.log('Admin user creation completed successfully');
      process.exit(0);
    } else {
      console.error('Admin user creation failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error during admin user creation:', error);
    process.exit(1);
  });
EOF
  
  # スクリプトを実行
  echo "Executing Prisma admin creation script..."
  node /tmp/create-admin-prisma.js
  
  if [ $? -eq 0 ]; then
    echo "Admin user created successfully with Prisma!"
  else
    echo "CRITICAL ERROR: Failed to create admin user with Prisma!"
  fi
fi

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
