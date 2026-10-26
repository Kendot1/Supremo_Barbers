const crypto = require('crypto');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

console.log('\n🔐 Password Hash Verification\n');
console.log('admin123:', hashPassword('admin123'));
console.log('barber123:', hashPassword('barber123'));
console.log('123456:', hashPassword('123456'));

console.log('\n✅ Expected Hashes:');
console.log('admin123:  240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');
console.log('barber123: 6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a84118090');
console.log('123456:    8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92');

console.log('\n🔍 Verification:');
console.log('admin123 match:', hashPassword('admin123') === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');
console.log('barber123 match:', hashPassword('barber123') === '6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a84118090');
console.log('123456 match:', hashPassword('123456') === '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92');

console.log('\n✨ Run this with: node verify-hash.js\n');
