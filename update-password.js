const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log(`パスワード '${password}' のハッシュ:`, hash);
  
  // SQLコマンドを生成
  console.log('\nSQLコマンド:');
  console.log(`UPDATE users SET password = '${hash}' WHERE username = 'admin';`);
}

generateHash().catch(console.error);