// 管理者アカウント作成スクリプト
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('管理者アカウント作成処理を開始します...');
    
    // すべてのユーザー取得
    console.log('全ユーザーリストを取得中...');
    const allUsers = await prisma.user.findMany();
    console.log(`全${allUsers.length}件のユーザーを取得しました`);
    
    // 管理者アカウントを探す
    const existingAdmin = allUsers.find(user => 
      user.username.toLowerCase() === 'admin' || 
      user.role.toLowerCase() === 'admin'
    );
    
    if (existingAdmin) {
      console.log('管理者アカウントは既に存在します。パスワードを更新します。');
      
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // パスワードを更新
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { 
          password: hashedPassword,
          isApproved: true 
        }
      });
      
      console.log(`既存の管理者アカウント(ID: ${existingAdmin.id})のパスワードを更新しました`);
    } else {
      console.log('管理者アカウントが存在しません。新規作成します。');
      
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // 新しい管理者アカウントを作成
      const newAdmin = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          password: hashedPassword,
          fullName: '管理者',
          role: 'admin',
          isApproved: true,
        }
      });
      
      console.log(`新しい管理者アカウントを作成しました (ID: ${newAdmin.id})`);
    }
    
    // 確認のため全ユーザーリストを表示
    const updatedUsers = await prisma.user.findMany({
      select: { id: true, username: true, role: true, isApproved: true }
    });
    
    console.log('現在のユーザー一覧:');
    console.table(updatedUsers);
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
