// Manual Version Configuration
// Edit this file to set your app version manually

const VERSION_CONFIG = {
  // Change these values manually for each release
  major: 1,
  minor: 4,
  patch: 1,
  
  // Optional: add build suffix (leave empty for clean versions)
  buildSuffix: '', // e.g., 'beta', 'rc1', etc.
  
  // Release notes for this version
  releaseNotes: [
    "Version display added to header for debugging",
    "Fixed update notification spam", 
    "Enhanced version tracking system",
    "Improved PWA update detection",
    "Manual version control implemented",
    "Added floating chatbot component (coming soon)"
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