import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get current timestamp for build time
const buildTime = new Date().toISOString();
const buildTimestamp = Date.now().toString();

// Check if we should use manual versioning
const useManualVersioning = process.env.MANUAL_VERSION === 'true' || fs.existsSync('./version-config.js') || hasManualVersionJson();

let versionConfig = {
  version: `1.0.${buildTimestamp}`,
  releaseNotes: [
    "Bug fixes and performance improvements",
    "Enhanced security features", 
    "Fresh app cache for better performance",
    "Updated offline capabilities"
  ],
  forceUpdate: false,
  minimumSupportedVersion: "1.0.0"
};

console.log(`📅 Build time: ${buildTime}`);

// Check if version.json has manual version (not timestamp-based)
function hasManualVersionJson() {
  const versionPath = path.join(__dirname, 'public', 'version.json');
  if (fs.existsSync(versionPath)) {
    try {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      // If version doesn't look like timestamp (1.0.123456789), it's manual
      const isTimestampVersion = /^1\.0\.\d{13}$/.test(versionData.version);
      return !isTimestampVersion;
    } catch (error) {
      return false;
    }
  }
  return false;
}

// Update service worker version
const updateServiceWorkerVersion = (version) => {
  const swPath = path.join(__dirname, 'public', 'sw.js');
  
  try {
    let swContent = fs.readFileSync(swPath, 'utf8');
    
    // Update version
    swContent = swContent.replace(/const APP_VERSION = '[^']*'/, `const APP_VERSION = '${version}'`);
    
    fs.writeFileSync(swPath, swContent);
    console.log(`✅ Service Worker version updated to: ${version}`);
    return version;
  } catch (error) {
    console.error('❌ Error updating service worker:', error);
    return version;
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
    
    // Update version only (keep name clean without version)
    manifestContent.version = version;
    
    // Keep name clean without version
    manifestContent.name = "VNQ System";
    manifestContent.short_name = "VNQ System";
    
    // Keep description clean without version
    manifestContent.description = "VNQ Management System - Comprehensive Business Management Solution";
    
    // Use clean start URL
    manifestContent.start_url = "/";
    
    // Use clean ID
    manifestContent.id = "/";
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2));
    console.log(`✅ Manifest updated - Name: "${manifestContent.name}", Version: ${version}`);
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
const createVersionInfo = (config) => {
  const versionInfo = {
    version: config.version,
    buildTime,
    buildTimestamp,
    buildDate: new Date().toLocaleDateString(),
    gitCommit: process.env.GIT_COMMIT || 'unknown',
    environment: process.env.NODE_ENV || 'production',
    releaseNotes: config.releaseNotes,
    minimumSupportedVersion: config.minimumSupportedVersion,
    forceUpdate: config.forceUpdate
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
const main = async () => {
  const args = process.argv.slice(2);
  const isPostBuild = args.includes('--post-build');
  
  // Set up version config
  await setupVersionConfig();
  
  if (isPostBuild) {
    // Post-build tasks
    console.log('🏗️ Running post-build version update...');
    updateIndexHtml();
  } else {
    // Pre-build tasks
    console.log('🚀 Running pre-build version update...');
    updateServiceWorkerVersion(versionConfig.version);
    updatePackageVersion(versionConfig.version);
    updateManifest(versionConfig.version);
    createVersionInfo(versionConfig);
  }
  
  console.log('✨ Version update complete!');
};

// Setup version configuration
const setupVersionConfig = async () => {
  if (useManualVersioning) {
    // First check if version.json already has manual settings
    if (hasManualVersionJson()) {
      try {
        const versionPath = path.join(__dirname, 'public', 'version.json');
        const existingData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        
        versionConfig.version = existingData.version;
        versionConfig.releaseNotes = existingData.releaseNotes;
        versionConfig.forceUpdate = existingData.forceUpdate || false;
        versionConfig.minimumSupportedVersion = existingData.minimumSupportedVersion || "1.0.0";
        
        console.log('🔨 Using EXISTING MANUAL version.json...');
        console.log(`📋 Version: ${versionConfig.version}`);
        console.log(`📝 Release Notes: ${versionConfig.releaseNotes.length} items`);
        return;
      } catch (error) {
        console.log('⚠️ Error reading existing version.json');
      }
    }
    
    // Try to load from version-config.js
    if (fs.existsSync('./version-config.js')) {
      try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const { VERSION_CONFIG, getVersionString } = require('./version-config.js');
        
        versionConfig.version = getVersionString();
        versionConfig.releaseNotes = VERSION_CONFIG.releaseNotes;
        versionConfig.forceUpdate = VERSION_CONFIG.forceUpdate;
        versionConfig.minimumSupportedVersion = VERSION_CONFIG.minimumSupportedVersion;
        
        console.log('🔨 Using MANUAL version-config.js...');
        console.log(`📋 Version: ${versionConfig.version}`);
        return;
      } catch (error) {
        console.log('⚠️ Error loading manual version config');
      }
    }
    
    console.log('⚠️ Manual versioning requested but no valid config found, using automatic');
  }
  
  console.log('🔨 Using AUTOMATIC versioning...');
};

// Run the script
main(); 