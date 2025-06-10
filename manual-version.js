const fs = require('fs');
const path = require('path');

// Manual Version Settings - EDIT THESE FOR EACH RELEASE
const MANUAL_VERSION = "2.0.0";
const RELEASE_NOTES = [
  "Version display added to header for debugging",
  "nice"
];

console.log('📋 Manual Version Update');
console.log(`🏷️  Setting version to: ${MANUAL_VERSION}`);

// Update version.json
const updateVersionFile = () => {
  const versionPath = path.join(__dirname, 'public', 'version.json');
  
  try {
    let versionData;
    if (fs.existsSync(versionPath)) {
      versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    } else {
      versionData = {};
    }
    
    // Update with manual settings
    versionData.version = MANUAL_VERSION;
    versionData.releaseNotes = RELEASE_NOTES;
    versionData.buildTime = new Date().toISOString();
    versionData.buildTimestamp = Date.now().toString();
    versionData.buildDate = new Date().toLocaleDateString();
    versionData.environment = "production";
    versionData.minimumSupportedVersion = "1.0.0";
    versionData.forceUpdate = false;
    
    fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
    console.log('✅ version.json updated');
    
    return versionData;
  } catch (error) {
    console.error('❌ Error updating version.json:', error);
    return null;
  }
};

// Update service worker
const updateServiceWorker = (version) => {
  const swPath = path.join(__dirname, 'public', 'sw.js');
  
  try {
    if (!fs.existsSync(swPath)) {
      console.log('⚠️  sw.js not found, skipping service worker update');
      return;
    }
    
    let swContent = fs.readFileSync(swPath, 'utf8');
    swContent = swContent.replace(/const APP_VERSION = '[^']*'/, `const APP_VERSION = '${version}'`);
    
    fs.writeFileSync(swPath, swContent);
    console.log('✅ Service worker updated');
  } catch (error) {
    console.error('❌ Error updating service worker:', error);
  }
};

// Update package.json
const updatePackageJson = (version) => {
  const packagePath = path.join(__dirname, 'package.json');
  
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageData.version = version;
    
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));
    console.log('✅ package.json updated');
  } catch (error) {
    console.error('❌ Error updating package.json:', error);
  }
};

// Update manifest
const updateManifest = (version) => {
  const manifestPath = path.join(__dirname, 'public', 'manifest.json');
  
  try {
    if (!fs.existsSync(manifestPath)) {
      console.log('⚠️  manifest.json not found, skipping manifest update');
      return;
    }
    
    const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifestData.version = version;
    manifestData.name = "NoorHub";
    manifestData.short_name = "NoorHub";
    manifestData.description = "Team management and communication platform for NoorHub";
    manifestData.start_url = "/";
    manifestData.id = "/";
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
    console.log('✅ manifest.json updated');
  } catch (error) {
    console.error('❌ Error updating manifest.json:', error);
  }
};

// Run the update
const versionData = updateVersionFile();
if (versionData) {
  updateServiceWorker(versionData.version);
  updatePackageJson(versionData.version);
  updateManifest(versionData.version);
  
  console.log('\n🎉 Manual version update complete!');
  console.log(`📋 Version: ${versionData.version}`);
  console.log('📝 Release Notes:');
  versionData.releaseNotes.forEach(note => console.log(`   • ${note}`));
  console.log('\n💡 Next steps:');
  console.log('   1. Run: npm run build');
  console.log('   2. Deploy to your server');
  console.log('   3. Users will see the new version and release notes!');
} 