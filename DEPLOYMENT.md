# 🚀 Deployment Guide for NoorHub

This guide explains how to efficiently update your live web app at [https://noorreport.nooralqmar.com/](https://noorreport.nooralqmar.com/) without manual deletion and re-importing.

## 🛠️ One-Time Setup

### 1. Install Dependencies
```bash
npm install basic-ftp archiver
```

### 2. Configure Your Hosting Details
Edit `deployment.config.js` with your Plesk hosting details:

```javascript
ftp: {
  host: 'noorreport.nooralqmar.com',
  user: 'your-ftp-username',        // Get from Plesk Panel
  password: 'your-ftp-password',    // Get from Plesk Panel
  secure: false,                    // Set to true for FTPS
  port: 21,                         // Standard FTP port
  webRoot: '/httpdocs'             // Main web directory
}
```

**To find your FTP credentials:**
1. Go to your Plesk Panel
2. Navigate to **Websites & Domains** → **FTP Access**
3. Use the main FTP account or create a new one

## 🚀 Deployment Methods

### Method 1: Automated FTP Deployment (Recommended)

**Quick deployment:**
```bash
npm run deploy
```

**Deploy to staging:**
```bash
npm run deploy:staging
```

**Deploy without rebuilding:**
```bash
npm run quick-deploy
```

### Method 2: Zip Upload via File Manager

**Create deployment zip:**
```bash
npm run zip-deploy
```

Then:
1. Go to **Plesk Panel → File Manager**
2. Navigate to `httpdocs` folder
3. Upload `noorhub-deployment.zip`
4. Extract the zip file
5. Delete the zip file

### Method 3: One-Command Script

**Make script executable (Linux/Mac):**
```bash
chmod +x build-and-deploy.sh
./build-and-deploy.sh
```

**Windows:**
```bash
bash build-and-deploy.sh
```

## 📋 Daily Workflow

### Quick Update Process:
1. Make your changes in Cursor
2. Test locally: `npm run dev`
3. Deploy: `npm run deploy`
4. ✅ Your changes are live!

### Development Workflow:
```bash
# 1. Make changes to your code
# 2. Test locally
npm run dev

# 3. Build and deploy in one command
npm run deploy

# 4. Check your live site
# https://noorreport.nooralqmar.com/
```

## 🔧 Advanced Options

### Environment-Specific Deployments
- **Production:** `npm run deploy`
- **Staging:** `npm run deploy:staging`

### Git Integration (If Available)
If your Plesk plan supports Git:
1. Go to **Plesk Panel → Git**
2. Connect your GitHub repository
3. Enable automatic deployment
4. Just push to GitHub: `git push origin main`

### Custom Build Commands
Add to `package.json`:
```json
{
  "scripts": {
    "deploy:dev": "npm run build:dev && node deploy-to-plesk.js",
    "deploy:prod": "npm run build && node deploy-to-plesk.js"
  }
}
```

## 🚨 Troubleshooting

### Common Issues:

**FTP Connection Failed:**
- Check your FTP credentials in `deployment.config.js`
- Ensure FTP is enabled in your Plesk hosting plan
- Try using FTPS by setting `secure: true`

**Permission Denied:**
- Make sure your FTP user has write access to httpdocs
- Check if your hosting provider blocks FTP uploads

**Build Fails:**
- Run `npm run build` separately to check for build errors
- Check for TypeScript or ESLint errors

### Alternative Upload Methods:
1. **Plesk File Manager** (Manual upload)
2. **FTP Client** (FileZilla, WinSCP)
3. **Git Integration** (if supported by hosting plan)

## 📁 File Structure After Deployment

```
httpdocs/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
├── images/
└── ...
```

## 🎯 Benefits of This Setup

✅ **No manual deletion/re-import needed**
✅ **One-command deployment**
✅ **Automatic building**
✅ **Environment-specific deployments**
✅ **Backup and rollback options**
✅ **Fast and efficient updates**

## 📞 Support

If you encounter issues:
1. Check Plesk hosting documentation
2. Contact your hosting provider for FTP details
3. Test FTP connection manually with an FTP client

---

**Your live app:** [https://noorreport.nooralqmar.com/](https://noorreport.nooralqmar.com/) 