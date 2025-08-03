require('dotenv').config();

console.log('🔍 Environment Variables Check (Safe Version)\n');

const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

console.log('📋 Current Values:');
console.log('Public Key:', publicKey ? `✅ Set (${publicKey.length} characters)` : '❌ Missing');
console.log('Private Key:', privateKey ? `✅ Set (${privateKey.length} characters)` : '❌ Missing');
console.log('URL Endpoint:', urlEndpoint ? `✅ Set (${urlEndpoint.length} characters)` : '❌ Missing');

console.log('\n🔍 Format Analysis:');

if (publicKey) {
  if (publicKey.startsWith('pk_')) {
    console.log('✅ Public key format looks correct (starts with pk_)');
  } else {
    console.log('❌ Public key should start with pk_');
  }
}

if (privateKey) {
  if (privateKey.startsWith('private_')) {
    console.log('✅ Private key format looks correct (starts with private_)');
  } else {
    console.log('❌ Private key should start with private_');
  }
}

if (urlEndpoint) {
  if (urlEndpoint.startsWith('https://ik.imagekit.io/')) {
    console.log('✅ URL endpoint format looks correct');
  } else {
    console.log('❌ URL endpoint should start with https://ik.imagekit.io/');
  }
}

console.log('\n💡 If any format is incorrect, please check your .env file and ImageKit dashboard.'); 