import React, { useState, useEffect } from 'react';
import { Smartphone, Globe, Wifi, WifiOff } from 'lucide-react';
import { pwaUpdateHelper } from '@/utils/pwaUpdateHelper';

interface VersionDisplayProps {
  variant?: 'sidebar' | 'compact';
}

const VersionDisplay: React.FC<VersionDisplayProps> = ({ variant = 'sidebar' }) => {
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [isPWA, setIsPWA] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadVersionInfo();
    
    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadVersionInfo = async () => {
    try {
      // First try to get version from version.json (most reliable)
      const response = await fetch('/version.json?t=' + Date.now());
      if (response.ok) {
        const versionData = await response.json();
        const correctVersion = versionData.version || '1.0.0';
        
        // Update localStorage with correct version to sync all components
        localStorage.setItem('app-version', correctVersion);
        
        setCurrentVersion(correctVersion);
        console.log('[VersionDisplay] Loaded and synced version from version.json:', correctVersion);
        return;
      }
    } catch (error) {
      console.log('[VersionDisplay] Could not fetch version.json, using fallback');
    }

    // Fallback to localStorage or meta tag
    const storedVersion = localStorage.getItem('app-version');
    const buildTime = document.querySelector('meta[name="build-time"]')?.getAttribute('content');
    
    let displayVersion = '1.0.0';
    if (storedVersion) {
      // Only format versions that are actually timestamp-based (e.g., 1.0.1749491283913)
      const parts = storedVersion.split('.');
      if (parts.length === 3 && parts[2].length > 10) {
        // This is a timestamp version, format it nicely
        displayVersion = `${parts[0]}.${parts[1]}.${parts[2].slice(-3)}`;
      } else {
        // This is a normal semantic version, use as-is
        displayVersion = storedVersion;
      }
    } else if (buildTime) {
      displayVersion = `1.0.${buildTime.slice(-3)}`; // Show last 3 digits
    }
    
    setCurrentVersion(displayVersion);
    setIsPWA(pwaUpdateHelper.isPWA());
  };

  const getBuildDate = (): string => {
    const buildTime = document.querySelector('meta[name="build-time"]')?.getAttribute('content');
    if (buildTime) {
      const date = new Date(parseInt(buildTime));
      return date.toLocaleDateString();
    }
    return 'Unknown';
  };

  const getFullVersion = (): string => {
    return localStorage.getItem('app-version') || 'Unknown';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-3 w-3 text-red-500" />;
    if (isPWA) return <Smartphone className="h-3 w-3 text-green-600" />;
    return <Globe className="h-3 w-3 text-blue-600" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isPWA) return 'PWA';
    return 'Web';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-600 bg-red-50 border-red-200';
    if (isPWA) return 'text-green-600 bg-green-50 border-green-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  if (variant === 'compact') {
    return (
      <div
        className="h-7 px-2 text-xs font-mono bg-gray-100 flex items-center gap-1 rounded cursor-default"
        title="Version information"
          >
            {getStatusIcon()}
            <span>v{currentVersion}</span>
          </div>
    );
  }

  // Sidebar variant (default)
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 cursor-default ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="font-mono text-xs">v{currentVersion}</span>
        </div>
  );
};

export default VersionDisplay; 