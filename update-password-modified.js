const bcrypt = require('bcryptjs');
const fs = require('fs');

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  const output = `
パスワード '${password}' のハッシュ: ${hash}

SQLコマンド:
UPDATE users SET password = '${hash}' WHERE username = 'admin';
`;
  
  console.log(output);
  fs.writeFileSync('password-hash.txt', output);
}

generateHash().catch(console.error);