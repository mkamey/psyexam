import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// データベース接続の詳細なデバッグ
console.log('DATABASE_URL環境変数:', process.env.DATABASE_URL ? '設定されています' : '設定されていません');
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL先頭部分:', process.env.DATABASE_URL.substring(0, 20) + '...');
}

// Prismaクライアントの初期化
console.log('Prismaクライアントを初期化中...');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
console.log('Prismaクライアント初期化完了');

// 管理者ユーザーのパスワード（admin123）
const ADMIN_PASSWORD_HASH = '$2a$10$K0hyQ9BkYVhVcD0iO5XrGOQ1PfC3hD6QJm1uSvl6NbOQb.0za8Ttu';

// 新しいパスワードハッシュを生成する関数（必要に応じて）
async function generatePasswordHash(password) {
  return await bcrypt.hash(password, 10);
}

async function seed() {
  console.log('🌱 データベースのシード処理を開始します...');
  
  try {
    // データベース接続テスト
    console.log('データベース接続をテスト中...');
    await prisma.$connect();
    console.log('データベース接続成功！');
    
    // テーブル一覧を取得
    console.log('テーブル情報を取得中...');
    const tables = await prisma.$queryRaw`SHOW TABLES;`;
    console.log('テーブル一覧:', tables);
    
    // 既存のユーザーを確認
    console.log('ユーザーテーブルを確認中...');
    let userCount = 0;
    try {
      userCount = await prisma.user.count();
      console.log(`現在のユーザー数: ${userCount}`);
    } catch (countError) {
      console.error('ユーザー数の取得に失敗しました:', countError);
    }
    
    // adminユーザーが存在するか確認
    console.log('管理者ユーザーを確認中...');
    let existingAdmin = null;
    try {
      existingAdmin = await prisma.user.findUnique({
        where: { username: 'admin' }
      });
    } catch (findError) {
      console.error('管理者ユーザーの検索に失敗しました:', findError);
    }
    
    if (existingAdmin) {
      console.log('管理者ユーザーは既に存在します:', existingAdmin.id);
    } else {
      console.log('管理者ユーザーが見つかりません。新規作成します...');
      
      try {
        // 管理者ユーザーを作成
        const adminUser = await prisma.user.create({
          data: {
            username: 'admin',
            email: 'admin@example.com',
            fullName: '管理者',
            password: ADMIN_PASSWORD_HASH, // admin123
            role: 'admin',
            isApproved: true
          }
        });
        
        console.log('管理者ユーザーを作成しました:', adminUser);
      } catch (createError) {
        console.error('管理者ユーザーの作成に失敗しました:', createError);
        
        // エラーの詳細を確認
        if (createError.code === 'P2002') {
          console.log('一意制約違反: 既に同じユーザー名またはメールアドレスが存在します');
          
          // 既存のユーザーを更新する試み
          try {
            console.log('既存のユーザーを更新する試み...');
            const updatedUser = await prisma.user.updateMany({
              where: {
                OR: [
                  { username: 'admin' },
                  { email: 'admin@example.com' }
                ]
              },
              data: {
                password: ADMIN_PASSWORD_HASH,
                role: 'admin',
                isApproved: true
              }
            });
            console.log('ユーザー更新結果:', updatedUser);
          } catch (updateError) {
            console.error('ユーザー更新に失敗しました:', updateError);
          }
        }
      }
    }
    
    // 全ユーザーリストを表示
    console.log('全ユーザーリストを取得中...');
    try {
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isApproved: true
        }
      });
      
      console.log('全ユーザーリスト:', JSON.stringify(allUsers, null, 2));
    } catch (listError) {
      console.error('ユーザーリストの取得に失敗しました:', listError);
    }
    
    console.log('✅ シード処理が完了しました');
  } catch (error) {
    console.error('❌ シード処理中にエラーが発生しました:', error);
    throw error; // エラーを再スローしてプロセスが終了するようにする
  } finally {
    // 接続を閉じる
    try {
      await prisma.$disconnect();
      console.log('Prisma接続を閉じました');
    } catch (disconnectError) {
      console.error('Prisma接続を閉じる際にエラーが発生しました:', disconnectError);
    }
  }
}

// シード処理を実行
console.log('シード関数を実行します...');
seed()
  .then(() => {
    console.log('シード処理が正常に完了しました');
    process.exit(0);
  })
  .catch(e => {
    console.error('シード処理中に致命的なエラーが発生しました:', e);
    process.exit(1);
  });