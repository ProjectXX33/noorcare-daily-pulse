const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Update System Components...\n');

// Test 1: Check if required files exist
console.log('📁 Step 1: Checking required files...');
const requiredFiles = [
  'public/update-trigger.txt',
  'public/version.json',
  'public/sw.js',
  'src/components/AutoRefreshManager.tsx',
  'deploy-with-refresh.cjs',
  'update-sw-version.cjs'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

// Test 2: Check update trigger content
console.log('\n⚡ Step 2: Checking update trigger...');
try {
  const triggerContent = fs.readFileSync('public/update-trigger.txt', 'utf8').trim();
  if (triggerContent && !isNaN(triggerContent)) {
    console.log(`✅ Update trigger: ${triggerContent}`);
    const triggerDate = new Date(parseInt(triggerContent));
    console.log(`📅 Trigger date: ${triggerDate.toLocaleString()}`);
  } else {
    console.log('❌ Invalid update trigger content');
  }
} catch (error) {
  console.log('❌ Error reading update trigger:', error.message);
}

// Test 3: Check version.json
console.log('\n📋 Step 3: Checking version info...');
try {
  const versionInfo = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
  console.log(`✅ Version: ${versionInfo.version}`);
  console.log(`✅ Build time: ${versionInfo.buildTime}`);
  console.log(`✅ Release notes: ${versionInfo.releaseNotes?.length || 0} items`);
} catch (error) {
  console.log('❌ Error reading version info:', error.message);
}

// Test 4: Check service worker version
console.log('\n🔄 Step 4: Checking service worker...');
try {
  const swContent = fs.readFileSync('public/sw.js', 'utf8');
  const versionMatch = swContent.match(/const APP_VERSION = '([^']+)'/);
  if (versionMatch) {
    console.log(`✅ Service Worker version: ${versionMatch[1]}`);
  } else {
    console.log('❌ Could not find APP_VERSION in service worker');
  }
  
  const cacheMatch = swContent.match(/const CACHE_NAME = `([^`]+)`/);
  if (cacheMatch) {
    console.log(`✅ Cache name pattern: ${cacheMatch[1]}`);
  } else {
    console.log('❌ Could not find CACHE_NAME in service worker');
  }
} catch (error) {
  console.log('❌ Error reading service worker:', error.message);
}

// Test 5: Check package.json script
console.log('\n📦 Step 5: Checking package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.scripts['deploy:refresh']) {
    console.log(`✅ Deploy script: ${packageJson.scripts['deploy:refresh']}`);
  } else {
    console.log('❌ deploy:refresh script not found in package.json');
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

console.log('\n🎉 Update System Test Complete!');
console.log('\n💡 To deploy with automatic refresh:');
console.log('   npm run deploy:refresh');
console.log('\n📱 Users will automatically be notified of updates!'); 