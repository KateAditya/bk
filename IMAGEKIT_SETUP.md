# ImageKit Setup Guide

## Step 1: Create ImageKit Account
1. Go to [ImageKit.io](https://imagekit.io) and sign up for a free account
2. Verify your email address

## Step 2: Get Your Credentials
1. Login to your ImageKit dashboard: https://imagekit.io/dashboard
2. Go to **Developer Options** in the left sidebar
3. Copy your credentials:
   - **Public Key**
   - **Private Key** 
   - **URL Endpoint**

## Step 3: Set Environment Variables

### For Local Development:
Create a `.env` file in your project root with:

```env
# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=your_public_key_here
IMAGEKIT_PRIVATE_KEY=your_private_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_endpoint_here

# Other required variables
DB_HOST=dream-db-kateaditya806-01d3.f.aivencloud.com
DB_PORT=12345
DB_USER=avnadmin
DB_PASSWORD=AVNS_1234567890
DB_NAME=defaultdb
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SESSION_SECRET=your-super-secret-session-key
NODE_ENV=development
PORT=3000
```

### For Vercel Deployment:
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:
   - `IMAGEKIT_PUBLIC_KEY` = your_public_key_here
   - `IMAGEKIT_PRIVATE_KEY` = your_private_key_here
   - `IMAGEKIT_URL_ENDPOINT` = https://ik.imagekit.io/your_endpoint_here
   - `DB_HOST` = dream-db-kateaditya806-01d3.f.aivencloud.com
   - `DB_PORT` = 12345
   - `DB_USER` = avnadmin
   - `DB_PASSWORD` = AVNS_1234567890
   - `DB_NAME` = defaultdb
   - `ADMIN_USERNAME` = admin
   - `ADMIN_PASSWORD` = admin123
   - `SESSION_SECRET` = your-super-secret-session-key
   - `NODE_ENV` = production

## Step 4: Test the Setup
1. Start your server: `npm start`
2. Check the console logs for ImageKit configuration status
3. Try uploading an image through your dashboard
4. Check the `/api/health` endpoint to verify ImageKit status

## Troubleshooting

### If images are not uploading:
1. Verify all environment variables are set correctly
2. Check that your ImageKit account is active
3. Ensure your private key and public key match
4. Verify the URL endpoint is correct

### Common Issues:
- **"Your account cannot be authenticated"**: Check your private key
- **"Public key not found"**: Verify your public key
- **"URL endpoint invalid"**: Ensure the endpoint starts with `https://ik.imagekit.io/`

## ImageKit Dashboard Features
- **Media Library**: View all uploaded images
- **Transformations**: Apply image transformations
- **Analytics**: Track image usage and performance
- **Settings**: Configure domains, security, etc.

## Support
- ImageKit Documentation: https://docs.imagekit.io/
- ImageKit Support: support@imagekit.io
- Community Forum: https://community.imagekit.io/ 