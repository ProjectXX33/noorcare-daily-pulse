import ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';
import { getEnvironmentConfig } from './deployment.config.js';

// Get configuration for current environment
const env = process.argv.includes('--env=staging') ? 'staging' : 'production';
const config = getEnvironmentConfig(env);

const FTP_CONFIG = config.ftp;
const LOCAL_BUILD_DIR = config.build.sourceDir;
const REMOTE_DIR = config.ftp.webRoot;

async function deployToPlesk() {
  const client = new ftp.Client();
  
  try {
    console.log('🚀 Starting deployment to Plesk...');
    
    // Connect to FTP
    await client.access(FTP_CONFIG);
    console.log('✅ Connected to FTP server');
    
    // Change to remote directory
    await client.ensureDir(REMOTE_DIR);
    console.log(`📁 Changed to directory: ${REMOTE_DIR}`);
    
    // Upload all files from build directory
    await client.uploadFromDir(LOCAL_BUILD_DIR, REMOTE_DIR);
    console.log('📤 Files uploaded successfully!');
    
    // Optional: Clear cache files if needed
    try {
      await client.remove('/.htaccess.backup');
    } catch (err) {
      // Ignore if backup doesn't exist
    }
    
    console.log('🎉 Deployment completed successfully!');
    console.log(`🌐 Your app is live at: ${config.url}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
  } finally {
    client.close();
  }
}

// Run deployment
deployToPlesk(); 