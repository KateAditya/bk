require('dotenv').config();
const ImageKit = require('imagekit');

console.log('🔍 Detailed ImageKit Debugging...\n');

// Check environment variables with more detail
const config = {
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
};

console.log('📋 Environment Variables Analysis:');
console.log('Public Key:', config.publicKey ? `✅ Set (${config.publicKey.substring(0, 10)}...)` : '❌ Missing');
console.log('Private Key:', config.privateKey ? `✅ Set (${config.privateKey.substring(0, 10)}...)` : '❌ Missing');
console.log('URL Endpoint:', config.urlEndpoint ? `✅ Set (${config.urlEndpoint})` : '❌ Missing');

// Validate URL endpoint format
if (config.urlEndpoint) {
  if (!config.urlEndpoint.startsWith('https://ik.imagekit.io/')) {
    console.log('⚠️ URL Endpoint format issue: Should start with https://ik.imagekit.io/');
  } else {
    console.log('✅ URL Endpoint format is correct');
  }
}

// Validate key lengths
if (config.publicKey) {
  if (config.publicKey.length < 20) {
    console.log('⚠️ Public key seems too short');
  } else {
    console.log('✅ Public key length looks good');
  }
}

if (config.privateKey) {
  if (config.privateKey.length < 20) {
    console.log('⚠️ Private key seems too short');
  } else {
    console.log('✅ Private key length looks good');
  }
}

console.log('\n🔧 Common Issues and Solutions:');

// Check for common mistakes
if (config.urlEndpoint && config.urlEndpoint.includes('your_endpoint_here')) {
  console.log('❌ URL Endpoint still contains placeholder text');
}

if (config.publicKey && config.publicKey.includes('your_public_key')) {
  console.log('❌ Public Key still contains placeholder text');
}

if (config.privateKey && config.privateKey.includes('your_private_key')) {
  console.log('❌ Private Key still contains placeholder text');
}

// Test with different authentication methods
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication Methods...');
  
  try {
    const imagekit = new ImageKit(config);
    
    // Method 1: Test with listFiles (requires private key)
    console.log('\n📋 Testing listFiles (requires private key)...');
    try {
      const files = await imagekit.listFiles({ limit: 1, skip: 0 });
      console.log('✅ Private key authentication successful!');
      console.log(`📁 Found ${files.length} files in your account`);
    } catch (error) {
      console.log('❌ Private key authentication failed:', error.message);
    }
    
    // Method 2: Test with getFileList (alternative method)
    console.log('\n📋 Testing getFileList (alternative method)...');
    try {
      const files = await imagekit.getFileList({ limit: 1, skip: 0 });
      console.log('✅ Alternative authentication successful!');
    } catch (error) {
      console.log('❌ Alternative authentication failed:', error.message);
    }
    
    // Method 3: Test with getFileDetails (if we have a file ID)
    console.log('\n📋 Testing getFileDetails...');
    try {
      // This will fail but helps identify the issue
      await imagekit.getFileDetails('test-file-id');
    } catch (error) {
      if (error.message.includes('not found')) {
        console.log('✅ Authentication working (file not found is expected)');
      } else {
        console.log('❌ Authentication issue:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ ImageKit initialization failed:', error.message);
  }
}

// Provide step-by-step solution
function provideSolution() {
  console.log('\n📝 Step-by-Step Solution:');
  console.log('1. Go to https://imagekit.io/dashboard');
  console.log('2. Login to your account');
  console.log('3. Go to "Developer Options" in the left sidebar');
  console.log('4. Copy the exact values (no extra spaces):');
  console.log('   - Public Key');
  console.log('   - Private Key');
  console.log('   - URL Endpoint');
  console.log('5. Update your .env file with these exact values');
  console.log('6. Make sure there are no extra spaces or quotes');
  console.log('7. Restart your server');
  console.log('8. Run this test again');
  
  console.log('\n🔗 Direct Links:');
  console.log('- Dashboard: https://imagekit.io/dashboard');
  console.log('- Developer Options: https://imagekit.io/dashboard/developer');
  console.log('- Documentation: https://docs.imagekit.io/getting-started/quickstart-guides/setup-your-first-imagekit-integration');
}

if (!config.publicKey || !config.privateKey || !config.urlEndpoint) {
  console.log('\n❌ Missing environment variables!');
  provideSolution();
  process.exit(1);
} else {
  testAuthentication().then(() => {
    provideSolution();
  });
} 