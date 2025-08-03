require('dotenv').config();
const ImageKit = require('imagekit');

console.log('🧪 Testing ImageKit Configuration...\n');

// Check environment variables
const config = {
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
};

console.log('📋 Environment Variables Check:');
console.log('Public Key:', config.publicKey ? '✅ Set' : '❌ Missing');
console.log('Private Key:', config.privateKey ? '✅ Set' : '❌ Missing');
console.log('URL Endpoint:', config.urlEndpoint ? '✅ Set' : '❌ Missing');

if (!config.publicKey || !config.privateKey || !config.urlEndpoint) {
  console.log('\n❌ ImageKit configuration incomplete!');
  console.log('📝 Please set the following environment variables:');
  console.log('   IMAGEKIT_PUBLIC_KEY=your_public_key');
  console.log('   IMAGEKIT_PRIVATE_KEY=your_private_key');
  console.log('   IMAGEKIT_URL_ENDPOINT=your_url_endpoint');
  console.log('\n🔗 Get your credentials from: https://imagekit.io/dashboard');
  process.exit(1);
}

// Test ImageKit connection
async function testImageKit() {
  try {
    const imagekit = new ImageKit(config);
    console.log('\n🔗 Testing ImageKit connection...');
    
    // Test listing files
    const files = await imagekit.listFiles({ limit: 1, skip: 0 });
    console.log('✅ ImageKit connection successful!');
    console.log('📁 Files in account:', files.length);
    
    // Test upload with a simple text file
    console.log('\n📤 Testing file upload...');
    const testFile = Buffer.from('Hello ImageKit!').toString('base64');
    const uploadResult = await imagekit.upload({
      file: testFile,
      fileName: 'test.txt',
      folder: '/test'
    });
    console.log('✅ File upload successful!');
    console.log('📄 Uploaded file URL:', uploadResult.url);
    
    // Clean up test file
    console.log('\n🧹 Cleaning up test file...');
    await imagekit.deleteFile(uploadResult.fileId);
    console.log('✅ Test file deleted successfully!');
    
    console.log('\n🎉 ImageKit is working perfectly!');
    console.log('✅ You can now upload images through your application.');
    
  } catch (error) {
    console.log('\n❌ ImageKit test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your credentials are correct');
    console.log('2. Check that your ImageKit account is active');
    console.log('3. Ensure your private key and public key match');
    console.log('4. Verify the URL endpoint is correct');
    console.log('\n📞 Need help? Contact ImageKit support: support@imagekit.io');
    process.exit(1);
  }
}

testImageKit(); 