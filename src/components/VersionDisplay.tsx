import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Code, Smartphone, Globe, Wifi, WifiOff } from 'lucide-react';
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
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-mono hover:bg-gray-100 flex items-center gap-1"
            title="Click for version details"
          >
            {getStatusIcon()}
            <span>v{currentVersion}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <h4 className="font-semibold text-sm">Version Information</h4>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Display Version:</span>
                <Badge variant="outline">v{currentVersion}</Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge variant={!isOnline ? "destructive" : isPWA ? "default" : "secondary"}>
                  {getStatusText()}
                </Badge>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Sidebar variant (default)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 hover:bg-gray-50 cursor-pointer ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="font-mono text-xs">v{currentVersion}</span>
        </div>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 max-w-[90vw] p-4" align="start" side="bottom" sideOffset={5}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            <div>
              <h4 className="font-semibold text-base">App Version</h4>
              <p className="text-sm text-gray-600">NoorHub PWA</p>
            </div>
          </div>
          
          {/* Version Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Version</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-sm">v{currentVersion}</Badge>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
              <Badge variant={!isOnline ? "destructive" : isPWA ? "default" : "secondary"} className="w-fit">
                {getStatusText()}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Build Date</p>
              <p className="text-sm font-medium">{getBuildDate()}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</p>
              <Badge variant={process.env.NODE_ENV === 'development' ? 'destructive' : 'default'} className="w-fit">
                {process.env.NODE_ENV || 'production'}
              </Badge>
            </div>
          </div>

          {/* Connection Status */}
          <div className={`p-3 rounded-lg border ${isOnline ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                {isOnline ? 'Connected' : 'Offline Mode'}
              </span>
            </div>
            <p className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Real-time updates available' : 'Limited functionality in offline mode'}
            </p>
          </div>
          
          {/* Debug Section - Only in Development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Developer Tools</span>
              </div>
              
              <div className="text-xs font-mono bg-gray-50 p-3 rounded border">
                <div className="space-y-1">
                  <div><span className="text-gray-500">Full Version:</span> {getFullVersion()}</div>
                  <div><span className="text-gray-500">User Agent:</span> {navigator.userAgent.split(' ')[0]}</div>
                  <div><span className="text-gray-500">Online:</span> {isOnline ? 'Yes' : 'No'}</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadVersionInfo}
                  className="flex-1 text-xs"
                >
                  Refresh Info
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    // Trigger manual update check
                    localStorage.removeItem('last-update-check');
                    localStorage.removeItem('app-build-time');
                    window.location.reload();
                  }}
                  className="flex-1 text-xs"
                >
                  Force Update
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VersionDisplay; 