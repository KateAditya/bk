# Environment Variables Setup Guide

## Create Your .env File

Create a file named `.env` in your project root with the following content:

```env
# ImageKit Configuration - Replace with your actual credentials
IMAGEKIT_PUBLIC_KEY=pk_your_actual_public_key_here
IMAGEKIT_PRIVATE_KEY=private_your_actual_private_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_actual_endpoint_here

# Database Configuration
DB_HOST=dream-db-kateaditya806-01d3.f.aivencloud.com
DB_PORT=12345
DB_USER=avnadmin
DB_PASSWORD=AVNS_1234567890
DB_NAME=defaultdb

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Session Secret
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Environment
NODE_ENV=development
PORT=3000

# Razorpay
RAZORPAY_ID_KEY=
RAZORPAY_SECRET_KEY=

# Google Sheets (REQUIRED for server write)
# Option A (recommended): point to a local JSON credentials file
GOOGLE_SERVICE_ACCOUNT_FILE=C:\\keys\\sa.json

# Option B: provide separate fields instead of a JSON blob
GOOGLE_CLIENT_EMAIL=sheet-access@paymentdetails-471609.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
# Spreadsheet ID (the long string in the sheet URL)
GOOGLE_SHEETS_ID=

# Tab name to write into (must exist exactly)
GOOGLE_SHEETS_TAB_NAME=Sheet1
```

## How to Get Your ImageKit Credentials

1. **Go to**: https://imagekit.io/dashboard
2. **Login** to your account
3. **Click "Developer Options"** in the left sidebar
4. **Copy these exact values**:

### Public Key
- Format: `pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Example: `pk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`

### Private Key  
- Format: `private_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Example: `private_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`

### URL Endpoint
- Format: `https://ik.imagekit.io/your_endpoint_name`
- Example: `https://ik.imagekit.io/mycompany`

## Important Notes

1. **No quotes** around the values
2. **No extra spaces** before or after the values
3. **Copy exactly** as shown in the dashboard
4. **Don't share** your private key with anyone

### Google Sheets Setup
- REQUIRED variables to write:
  - `GOOGLE_SERVICE_ACCOUNT_JSON`
  - `GOOGLE_SHEETS_ID`
  - `GOOGLE_SHEETS_TAB_NAME`
- Share your Google Sheet with: `sheet-access@paymentdetails-471609.iam.gserviceaccount.com`
- Spreadsheet must have columns in this exact order: `No, Name, Mobile, Email, Amount, PaymentID, Status, Date, Time, Method, Product`

## Test Your Setup

After creating the .env file:

```bash
# Test ImageKit configuration
npm run test-imagekit

# Or run the detailed debug
node debug-imagekit.js
```

## Common Mistakes to Avoid

- ❌ `IMAGEKIT_PUBLIC_KEY="pk_abc123..."`
- ❌ `IMAGEKIT_PUBLIC_KEY= pk_abc123...`
- ❌ `IMAGEKIT_PUBLIC_KEY=pk_abc123... `
- ✅ `IMAGEKIT_PUBLIC_KEY=pk_abc123...`

## Still Having Issues?

1. **Verify your ImageKit account is active**
2. **Check that you copied the entire key** (no truncation)
3. **Make sure there are no hidden characters**
4. **Try regenerating your keys** in the ImageKit dashboard
5. **Contact ImageKit support**: support@imagekit.io 