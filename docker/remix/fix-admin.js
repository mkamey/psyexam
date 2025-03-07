import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixAdmin() {
  try {
    console.log('管理者アカウント修正処理を開始します...');
    
    // 既存のadminユーザーを確認
    const existingAdmin = await prisma.user.findFirst({
      where: { 
        OR: [
          { username: 'admin' },
          { role: 'admin' }
        ]
      }
    });
    
    if (existingAdmin) {
      console.log(`既存の管理者アカウントを見つけました (ID: ${existingAdmin.id}, ユーザー名: ${existingAdmin.username})`);
      
      // パスワードを再設定
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // パスワードと承認状態を更新
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { 
          password: hashedPassword,
          isApproved: true,
          role: 'admin'
        }
      });
      
      console.log(`管理者アカウント(ID: ${existingAdmin.id})のパスワードと承認状態を更新しました`);
    } else {
      console.log('管理者アカウントが見つかりませんでした。新規作成します。');
      
      // 新しい管理者アカウントを作成
      const hashedPassword = await bcrypt.hash('admin123', 10);
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
    const allUsers = await prisma.user.findMany({
      select: { id: true, username: true, role: true, isApproved: true }
    });
    
    console.log('現在のユーザー一覧:');
    console.table(allUsers);
    
    console.log('管理者アカウント修正処理が完了しました。');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdmin();
