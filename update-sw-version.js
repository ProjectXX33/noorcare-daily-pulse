const fs = require('fs');
const path = require('path');

// Read current version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;

// Update service worker version
const swPath = path.join('public', 'sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');

// Update APP_VERSION in service worker
swContent = swContent.replace(
  /const APP_VERSION = '[^']+'/,
  `const APP_VERSION = '${currentVersion}'`
);

// Update CACHE_NAME to force cache refresh
swContent = swContent.replace(
  /const CACHE_NAME = `[^`]+`/,
  `const CACHE_NAME = \`noorhub-v\${APP_VERSION}-\${Date.now()}\``
);

fs.writeFileSync(swPath, swContent);

console.log(`✅ Service Worker updated to version ${currentVersion}`);
console.log(`🔄 Cache will be refreshed for all users`);

// Also update version.json for PWA version checker
const versionInfo = {
  version: currentVersion,
  buildTime: new Date().toISOString(),
  buildTimestamp: Date.now().toString(),
  buildDate: new Date().toLocaleDateString(),
  releaseNotes: [
    "System updated with latest features and improvements",
    "Enhanced performance and bug fixes",
    "Updated UI components and user experience"
  ],
  minimumSupportedVersion: currentVersion,
  forceUpdate: false
};

fs.writeFileSync(
  path.join('public', 'version.json'), 
  JSON.stringify(versionInfo, null, 2)
);

console.log(`📝 Version info updated in public/version.json`); 