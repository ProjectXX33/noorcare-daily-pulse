// Manual Version Configuration
// Edit this file to set your app version manually

const VERSION_CONFIG = {
  // Change these values manually for each release
  major: 7,
  minor: 1,
  patch: 0,
  
  // Optional: add build suffix (leave empty for clean versions)
  buildSuffix: '', // e.g., 'beta', 'rc1', etc.
  
  // Release notes for this version
  releaseNotes: [
    "🎉 Enhanced Team Shifts Management with comprehensive dashboard",
    "✅ Fixed Break Time calculation - now properly excludes from delay calculations",
    "📊 Added Break Time count display to team shifts summary",
    "🔧 Improved CSV Export for team shifts - matches main shifts page format",
    "🎨 Reorganized team shifts layout - 4 cards per row for better organization",
    "📱 Enhanced Team Statistics with proper count displays",
    "⚡ Smart Offsetting Summary with detailed breakdown",
    "🎯 Fixed unrealistic hour calculations in CSV exports",
    "🔒 Enhanced data validation and error handling",
    "🚀 Performance improvements and bug fixes"
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