import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { exec } from 'child_process';

function createDeploymentZip() {
  const output = fs.createWriteStream('noorhub-deployment.zip');
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  output.on('close', function() {
    console.log('🎉 Deployment zip created successfully!');
    console.log(`📦 File size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log('📁 File: noorhub-deployment.zip');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go to your Plesk Panel → File Manager');
    console.log('2. Navigate to httpdocs folder');
    console.log('3. Upload noorhub-deployment.zip');
    console.log('4. Extract the zip file');
    console.log('5. Delete the zip file after extraction');
    console.log('');
    console.log('🌐 Your app will be live at: https://noorreport.nooralqmar.com/');
  });

  archive.on('error', function(err) {
    console.error('❌ Error creating zip:', err);
    throw err;
  });

  archive.pipe(output);

  // Add all files from dist directory
  const distPath = './dist';
  if (fs.existsSync(distPath)) {
    archive.directory(distPath, false);
    console.log('✅ Added built files to zip');
  } else {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    return;
  }

  // Finalize the archive
  archive.finalize();
}

// Build first, then create zip
console.log('🏗️  Building application...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Build failed:', error);
    return;
  }
  
  console.log('✅ Build completed successfully!');
  console.log('📦 Creating deployment zip...');
  createDeploymentZip();
}); 