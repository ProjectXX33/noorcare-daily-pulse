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
    console.log('📋 Configuration:', {
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      localDir: LOCAL_BUILD_DIR,
      remoteDir: REMOTE_DIR
    });
    
    // Connect to FTP
    await client.access(FTP_CONFIG);
    console.log('✅ Connected to FTP server');
    
    // Change to remote directory
    await client.ensureDir(REMOTE_DIR);
    console.log(`📁 Changed to directory: ${REMOTE_DIR}`);
    
    // List current remote files for debugging
    const remoteFiles = await client.list(REMOTE_DIR);
    console.log('📂 Current remote files:', remoteFiles.map(f => f.name).slice(0, 10));
    
    // Upload all files from build directory
    console.log(`📤 Uploading from ${LOCAL_BUILD_DIR} to ${REMOTE_DIR}...`);
    await client.uploadFromDir(LOCAL_BUILD_DIR, REMOTE_DIR);
    console.log('📤 Files uploaded successfully!');
    
    // List remote files after upload
    const updatedFiles = await client.list(REMOTE_DIR);
    console.log('📂 Updated remote files:', updatedFiles.map(f => f.name).slice(0, 10));
    
    // Verify specific files exist
    try {
      const indexExists = await client.list(`${REMOTE_DIR}/index.html`);
      console.log('✅ index.html exists on server');
    } catch (err) {
      console.log('❌ index.html not found on server');
    }
    
    console.log('🎉 Deployment completed successfully!');
    console.log(`🌐 Your app is live at: ${config.url}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('Full error:', error);
  } finally {
    client.close();
  }
}

// Run deployment
deployToPlesk(); 