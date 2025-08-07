// Manual Version Configuration
// Edit this file to set your app version manually

const VERSION_CONFIG = {
  // Change these values manually for each release
  major: 5,
  minor: 1,
  patch: 0,
  
  // Optional: add build suffix (leave empty for clean versions)
  buildSuffix: '', // e.g., 'beta', 'rc1', etc.
  
  // Release notes for this version
  releaseNotes: [
    "🎉 Extended Check-in/Check-out to ALL Employee Roles",
    "✅ Copywriting, Media Buyer, and Web Developer can now check in/out",
    "📊 Monthly shift tracking now includes all employee positions",
    "🔧 Added default shifts for all roles with flexible scheduling options",
    "📈 Performance analytics extended to cover all employee positions",
    "🚀 Universal attendance system across all departments"
  ],
  
  // Update settings
  forceUpdate: false,
  minimumSupportedVersion: "1.0.0"
};

// Generate version string
function getVersionString() {
  const base = `${VERSION_CONFIG.major}.${VERSION_CONFIG.minor}.${VERSION_CONFIG.patch}`;
  return VERSION_CONFIG.buildSuffix ? `${base}-${VERSION_CONFIG.buildSuffix}` : base;
}

// Export for Node.js (CommonJS)
module.exports = {
  VERSION_CONFIG,
  getVersionString,
  version: getVersionString()
}; 