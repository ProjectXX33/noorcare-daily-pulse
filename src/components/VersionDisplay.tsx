import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Code, Smartphone, Globe } from 'lucide-react';
import { pwaUpdateHelper } from '@/utils/pwaUpdateHelper';

const VersionDisplay: React.FC = () => {
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    loadVersionInfo();
  }, []);

  const loadVersionInfo = () => {
    // Get current version from localStorage or meta tag
    const storedVersion = localStorage.getItem('app-version');
    const buildTime = document.querySelector('meta[name="build-time"]')?.getAttribute('content');
    
    let displayVersion = '1.0.0';
    if (storedVersion) {
      // Format long versions to short display (e.g., 1.0.1749491283913 -> 1.0)
      const parts = storedVersion.split('.');
      if (parts.length > 2 && parts[2].length > 6) {
        displayVersion = `${parts[0]}.${parts[1]}`;
      } else {
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs font-mono hover:bg-gray-100 flex items-center gap-1"
          title="Click for version details"
        >
          {isPWA ? (
            <Smartphone className="h-3 w-3 text-green-600" />
          ) : (
            <Globe className="h-3 w-3 text-blue-600" />
          )}
          <span>v{currentVersion}</span>
          <span className="ml-1 text-xs opacity-60">DEBUG</span>
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
              <span className="text-gray-600">Mode:</span>
              <Badge variant={isPWA ? "default" : "secondary"}>
                {isPWA ? 'PWA' : 'Web'}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Build Date:</span>
              <span>{getBuildDate()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Environment:</span>
              <Badge variant={process.env.NODE_ENV === 'development' ? 'destructive' : 'default'}>
                {process.env.NODE_ENV || 'production'}
              </Badge>
            </div>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="border-t pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Code className="h-3 w-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Debug</span>
              </div>
              
              <div className="text-xs font-mono bg-gray-50 p-2 rounded">
                <div className="break-all">Full: {getFullVersion()}</div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={loadVersionInfo}
                className="w-full text-xs"
              >
                Refresh
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VersionDisplay; 