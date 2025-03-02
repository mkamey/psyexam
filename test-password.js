const bcrypt = require('bcryptjs');

async function testPassword() {
  const password = 'admin123';
  const storedHash = '$2a$10$K0hyQ9BkYVhVcD0iO5XrGOQ1PfC3hD6QJm1uSvl6NbOQb.0za8Ttu';
  
  // 新しいハッシュを生成
  const newHash = await bcrypt.hash(password, 10);
  console.log('新しく生成したハッシュ:', newHash);
  
  // 保存されているハッシュと比較
  const isValid = await bcrypt.compare(password, storedHash);
  console.log('保存されているハッシュとの比較結果:', isValid);
  
  // 新しいハッシュと比較
  const isValidNew = await bcrypt.compare(password, newHash);
  console.log('新しいハッシュとの比較結果:', isValidNew);
}

testPassword().catch(console.error);