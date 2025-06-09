// Deployment Configuration for Plesk Hosting
// Update these settings with your Plesk hosting details

export default {
  // FTP/SFTP Configuration
  ftp: {
    host: 'noorreport.nooralqmar.com', // Your domain or FTP server
    user: 'projectx',         // FTP username from Plesk
    password: '@rY004s6n',     // FTP password from Plesk
    secure: false,                     // Set to true for FTPS (secure FTP)
    port: 21,                          // FTP port (21 for FTP, 22 for SFTP)
    
    // Remote directories
    webRoot: '/httpdocs',              // Main web directory (httpdocs or public_html)
    backupDir: '/httpdocs_backup'      // Backup directory (optional)
  },

  // Build Configuration
  build: {
    sourceDir: './dist',               // Local build output directory
    excludeFiles: [                    // Files to exclude from deployment
      '.DS_Store',
      'Thumbs.db',
      '*.log',
      'node_modules'
    ]
  },

  // Deployment Options
  deployment: {
    createBackup: true,                // Create backup before deployment
    clearCache: true,                  // Clear cache files after deployment
    notifications: {
      success: true,                   // Show success notifications
      webhook: null                    // Optional webhook URL for notifications
    }
  },

  // Environment-specific settings
  environments: {
    production: {
      url: 'https://noorreport.nooralqmar.com/',
      webRoot: '/httpdocs'
    },
    staging: {
      url: 'https://staging.noorreport.nooralqmar.com/',
      webRoot: '/staging'
    }
  }
};

// Helper function to get current environment config
export function getEnvironmentConfig(env = 'production') {
  const config = {
    // FTP/SFTP Configuration
    ftp: {
      host: 'noorreport.nooralqmar.com', // Your domain or FTP server
      user: 'projectx',         // FTP username from Plesk
      password: '@rY004s6n',     // FTP password from Plesk
      secure: false,                     // Set to true for FTPS (secure FTP)
      port: 21,                          // FTP port (21 for FTP, 22 for SFTP)
      
      // Remote directories
      webRoot: '/httpdocs',              // Main web directory (httpdocs or public_html)
      backupDir: '/httpdocs_backup'      // Backup directory (optional)
    },

    // Build Configuration
    build: {
      sourceDir: './dist',               // Local build output directory
      excludeFiles: [                    // Files to exclude from deployment
        '.DS_Store',
        'Thumbs.db',
        '*.log',
        'node_modules'
      ]
    },

    // Deployment Options
    deployment: {
      createBackup: true,                // Create backup before deployment
      clearCache: true,                  // Clear cache files after deployment
      notifications: {
        success: true,                   // Show success notifications
        webhook: null                    // Optional webhook URL for notifications
      }
    },

    // Environment-specific settings
    environments: {
      production: {
        url: 'https://noorreport.nooralqmar.com/',
        webRoot: '/httpdocs'
      },
      staging: {
        url: 'https://staging.noorreport.nooralqmar.com/',
        webRoot: '/staging'
      }
    }
  };
  
  const envConfig = config.environments[env];
  
  return {
    ...config,
    ftp: {
      ...config.ftp,
      webRoot: envConfig?.webRoot || config.ftp.webRoot
    },
    currentEnv: env,
    url: envConfig?.url || config.environments.production.url
  };
} 