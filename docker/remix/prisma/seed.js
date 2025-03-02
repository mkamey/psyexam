import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');
  
  try {
    // 既存のユーザーを確認
    const userCount = await prisma.user.count();
    console.log(`現在のユーザー数: ${userCount}`);
    
    // adminユーザーが存在するか確認
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (existingAdmin) {
      console.log('管理者ユーザーは既に存在します:', existingAdmin.id);
    } else {
      // 管理者ユーザーを作成
      // パスワードは既にハッシュ化されているものを使用
      const adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          fullName: '管理者',
          password: '$2a$10$K0hyQ9BkYVhVcD0iO5XrGOQ1PfC3hD6QJm1uSvl6NbOQb.0za8Ttu', // admin123
          role: 'admin',
          isApproved: true
        }
      });
      
      console.log('管理者ユーザーを作成しました:', adminUser.id);
    }
    
    // 全ユーザーリストを表示
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        isApproved: true
      }
    });
    
    console.log('全ユーザーリスト:', allUsers);
    
    console.log('✅ シード処理が完了しました');
  } catch (error) {
    console.error('❌ シード処理中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch(e => {
    console.error('シード処理中にエラーが発生しました:', e);
    process.exit(1);
  });