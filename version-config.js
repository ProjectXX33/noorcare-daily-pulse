// Manual Version Configuration
// Edit this file to set your app version manually

const VERSION_CONFIG = {
  // Change these values manually for each release
  major: 6,
  minor: 0,
  patch: 0,
  
  // Optional: add build suffix (leave empty for clean versions)
  buildSuffix: '', // e.g., 'beta', 'rc1', etc.
  
  // Release notes for this version
  releaseNotes: [
    "🎉 Enhanced Task Management with Pagination (6 tasks per page)",
    "✅ Fixed Team Assignment - 'No team assigned' now works correctly",
    "🎨 Beautiful Gradient Menu Borders matching the logo colors",
    "📱 Improved Mobile Experience with better responsive design",
    "🔧 Enhanced User Profile Dropdown with position and team display",
    "📊 Content & Creative Manager Dashboard with team-specific views",
    "⚡ Real-time Analytics from order submissions table",
    "🎯 Advanced Team Management with proper role-based access",
    "🔒 Enhanced Security with better access control",
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