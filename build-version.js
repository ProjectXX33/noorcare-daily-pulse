import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get current timestamp for build time
const buildTime = new Date().toISOString();
const buildTimestamp = Date.now().toString();

console.log('🔨 Starting build version update...');
console.log(`📅 Build time: ${buildTime}`);

// Update service worker version
const updateServiceWorkerVersion = () => {
  const swPath = path.join(__dirname, 'public', 'sw.js');
  
  try {
    let swContent = fs.readFileSync(swPath, 'utf8');
    
    // Update version with timestamp for uniqueness
    const version = `1.0.${buildTimestamp}`;
    swContent = swContent.replace(/const APP_VERSION = '[^']*'/, `const APP_VERSION = '${version}'`);
    
    fs.writeFileSync(swPath, swContent);
    console.log(`✅ Service Worker version updated to: ${version}`);
    return version;
  } catch (error) {
    console.error('❌ Error updating service worker:', error);
    return '1.0.0';
  }
};

// Update package.json version
const updatePackageVersion = (version) => {
  const packagePath = path.join(__dirname, 'package.json');
  
  try {
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageContent.version = version;
    
    fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
    console.log(`✅ Package.json version updated to: ${version}`);
  } catch (error) {
    console.error('❌ Error updating package.json:', error);
  }
};

// Update manifest.json with new version info
const updateManifest = (version) => {
  const manifestPath = path.join(__dirname, 'public', 'manifest.json');
  
  try {
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifestContent.version = version;
    manifestContent.description = `Team management and communication platform for NoorHub - v${version}`;
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2));
    console.log(`✅ Manifest version updated to: ${version}`);
  } catch (error) {
    console.error('❌ Error updating manifest:', error);
  }
};

// Update build time in index.html after build
const updateIndexHtml = () => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  // Only update if dist/index.html exists (after build)
  if (fs.existsSync(indexPath)) {
    try {
      let indexContent = fs.readFileSync(indexPath, 'utf8');
      indexContent = indexContent.replace('BUILD_TIME_PLACEHOLDER', buildTimestamp);
      
      fs.writeFileSync(indexPath, indexContent);
      console.log(`✅ Build time updated in index.html: ${buildTimestamp}`);
    } catch (error) {
      console.error('❌ Error updating index.html:', error);
    }
  } else {
    console.log('⏭️ Skipping index.html update (run after build)');
  }
};

// Create version info file
const createVersionInfo = (version) => {
  const versionInfo = {
    version,
    buildTime,
    buildTimestamp,
    buildDate: new Date().toLocaleDateString(),
    gitCommit: process.env.GIT_COMMIT || 'unknown',
    environment: process.env.NODE_ENV || 'production'
  };

  const versionPath = path.join(__dirname, 'public', 'version.json');
  
  try {
    fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
    console.log('✅ Version info file created');
  } catch (error) {
    console.error('❌ Error creating version info:', error);
  }
};

// Main execution
const main = () => {
  const args = process.argv.slice(2);
  const isPostBuild = args.includes('--post-build');
  
  if (isPostBuild) {
    // Post-build tasks
    console.log('🏗️ Running post-build version update...');
    updateIndexHtml();
  } else {
    // Pre-build tasks
    console.log('🚀 Running pre-build version update...');
    const version = updateServiceWorkerVersion();
    updatePackageVersion(version);
    updateManifest(version);
    createVersionInfo(version);
  }
  
  console.log('✨ Version update complete!');
};

// Run the script
main(); 