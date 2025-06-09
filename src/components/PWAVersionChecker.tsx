import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cacheManager } from '@/utils/cacheManager';

interface VersionInfo {
  version: string;
  buildTime: string;
  buildTimestamp: string;
  buildDate: string;
  releaseNotes: string[];
  minimumSupportedVersion: string;
  forceUpdate: boolean;
}

interface PWAVersionCheckerProps {
  checkInterval?: number; // in milliseconds
}

const PWAVersionChecker: React.FC<PWAVersionCheckerProps> = ({ 
  checkInterval = 5 * 60 * 1000 // Default: 5 minutes
}) => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [latestVersion, setLatestVersion] = useState<VersionInfo | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [updateType, setUpdateType] = useState<'optional' | 'recommended' | 'critical'>('optional');

  useEffect(() => {
    initializeVersionChecker();
    const interval = setInterval(checkForUpdates, checkInterval);
    
    return () => clearInterval(interval);
  }, [checkInterval]);

  const initializeVersionChecker = async () => {
    // Check if running as PWA
    const isPWAInstalled = detectPWA();
    setIsPWA(isPWAInstalled);
    
    // Get current version
    const current = getCurrentAppVersion();
    setCurrentVersion(current);
    
    // Only check for updates if it's a PWA
    if (isPWAInstalled) {
      await checkForUpdates();
      
      // Check immediately and then set up periodic checks
      setTimeout(checkForUpdates, 2000); // Initial check after 2 seconds
    }
  };

  const detectPWA = (): boolean => {
    // Multiple ways to detect PWA
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const iOSStandalone = (window.navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');
    const hasDisplayMode = window.matchMedia('(display-mode: fullscreen)').matches;
    
    return standaloneMode || iOSStandalone || isAndroidApp || hasDisplayMode;
  };

  const getCurrentAppVersion = (): string => {
    // Try multiple sources for current version
    const storedVersion = localStorage.getItem('app-version');
    const buildTime = document.querySelector('meta[name="build-time"]')?.getAttribute('content');
    const manifestVersion = localStorage.getItem('manifest-version');
    
    if (storedVersion) return storedVersion;
    if (buildTime) return `1.0.${buildTime}`;
    if (manifestVersion) return manifestVersion;
    
    return '1.0.0'; // Default fallback
  };

  const fetchLatestVersion = async (): Promise<VersionInfo | null> => {
    try {
      // Add cache busting to ensure fresh data
      const cacheBuster = Date.now();
      const response = await fetch(`/version.json?t=${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const versionInfo: VersionInfo = await response.json();
      console.log('[PWAVersionChecker] Latest version info:', versionInfo);
      
      return versionInfo;
    } catch (error) {
      console.error('[PWAVersionChecker] Error fetching version info:', error);
      return null;
    }
  };

  const compareVersions = (current: string, latest: string): number => {
    // Normalize versions by removing 'v' prefix if present
    const currentNormalized = current.replace(/^v/, '');
    const latestNormalized = latest.replace(/^v/, '');
    
    const currentParts = currentNormalized.split('.').map(n => parseInt(n) || 0);
    const latestParts = latestNormalized.split('.').map(n => parseInt(n) || 0);
    
    // Ensure both arrays have same length
    const maxLength = Math.max(currentParts.length, latestParts.length);
    while (currentParts.length < maxLength) currentParts.push(0);
    while (latestParts.length < maxLength) latestParts.push(0);
    
    for (let i = 0; i < maxLength; i++) {
      if (currentParts[i] < latestParts[i]) return -1;
      if (currentParts[i] > latestParts[i]) return 1;
    }
    
    return 0; // Equal
  };

  const determineUpdateType = (current: string, latest: VersionInfo): 'optional' | 'recommended' | 'critical' => {
    if (latest.forceUpdate) return 'critical';
    
    const comparison = compareVersions(current, latest.minimumSupportedVersion);
    if (comparison < 0) return 'critical';
    
    const versionComparison = compareVersions(current, latest.version);
    if (versionComparison < 0) {
      // Check how many versions behind
      const currentParts = current.split('.').map(n => parseInt(n) || 0);
      const latestParts = latest.version.split('.').map(n => parseInt(n) || 0);
      
      // If major version difference, it's recommended
      if (latestParts[0] > currentParts[0]) return 'recommended';
      
      // If minor version difference is more than 2, it's recommended
      if (latestParts[1] - currentParts[1] > 2) return 'recommended';
      
      return 'optional';
    }
    
    return 'optional';
  };

  const checkForUpdates = async () => {
    if (!isPWA) return;
    
    try {
      console.log('[PWAVersionChecker] Checking for updates...');
      setLastChecked(new Date());
      
      const latest = await fetchLatestVersion();
      if (!latest) return;
      
      setLatestVersion(latest);
      
      const comparison = compareVersions(currentVersion, latest.version);
      console.log('[PWAVersionChecker] Version comparison:', {
        current: currentVersion,
        latest: latest.version,
        comparison
      });
      
      if (comparison < 0) {
        // Current version is older
        const updateTypeResult = determineUpdateType(currentVersion, latest);
        setUpdateType(updateTypeResult);
        setShowUpdatePrompt(true);
        
        // Show toast notification
        toast.info(`App update available: v${latest.version}`, {
          description: 'A newer version of the app is available for download.',
          duration: 5000,
        });
        
        console.log('[PWAVersionChecker] Update available:', {
          type: updateTypeResult,
          latest: latest.version,
          current: currentVersion
        });
      } else {
        console.log('[PWAVersionChecker] App is up to date');
      }
      
    } catch (error) {
      console.error('[PWAVersionChecker] Error checking for updates:', error);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // Clear all caches and storage
      await cacheManager.clearAllCaches();
      
      // Update stored version
      if (latestVersion) {
        cacheManager.markAsUpdated(latestVersion.version);
      }
      
      // Show progress
      toast.info('Updating app to latest version...', {
        duration: 3000,
      });
      
      // Force refresh with cache bypass
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('[PWAVersionChecker] Error during update:', error);
      toast.error('Update failed. Please try again.');
      setIsUpdating(false);
    }
  };

  const dismissUpdate = () => {
    setShowUpdatePrompt(false);
    
    // Store dismissal for optional updates (don't show again for a while)
    if (updateType === 'optional' && latestVersion) {
      localStorage.setItem('dismissed-update', latestVersion.version);
      localStorage.setItem('dismissal-time', Date.now().toString());
    }
  };

  const getUpdateIcon = () => {
    switch (updateType) {
      case 'critical': return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'recommended': return <Download className="h-6 w-6 text-yellow-500" />;
      default: return <CheckCircle className="h-6 w-6 text-blue-500" />;
    }
  };

  const getUpdateBadgeColor = () => {
    switch (updateType) {
      case 'critical': return 'destructive';
      case 'recommended': return 'secondary';
      default: return 'outline';
    }
  };

  // Don't render if not PWA or no update available
  if (!isPWA || !showUpdatePrompt || !latestVersion) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto shadow-2xl border-2 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-xl">PWA Update Available</CardTitle>
                <CardDescription className="text-sm">
                  Your installed app can be updated
                </CardDescription>
              </div>
            </div>
            <Badge variant={getUpdateBadgeColor()} className="ml-2">
              v{latestVersion.version}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Version Info */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Current Version</p>
              <p className="text-xs text-muted-foreground">v{currentVersion}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Latest Version</p>
              <p className="text-xs text-muted-foreground">v{latestVersion.version}</p>
            </div>
          </div>

          {/* Update Type Alert */}
          {updateType === 'critical' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Critical update required. Your app version is no longer supported.
              </AlertDescription>
            </Alert>
          )}

          {updateType === 'recommended' && (
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription>
                Recommended update available with important improvements.
              </AlertDescription>
            </Alert>
          )}

          {/* Release Notes */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {getUpdateIcon()}
              What's new in this version:
            </div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {latestVersion.releaseNotes.map((note, index) => (
                <li key={index}>• {note}</li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleUpdate} 
              disabled={isUpdating}
              className="flex-1"
              variant={updateType === 'critical' ? 'destructive' : 'default'}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Update Now
                </>
              )}
            </Button>
            
            {updateType !== 'critical' && (
              <Button 
                variant="outline" 
                onClick={dismissUpdate}
                className="px-4"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* PWA Info */}
          <div className="text-xs text-center text-muted-foreground bg-primary/5 rounded p-2">
            <Smartphone className="h-4 w-4 inline mr-1" />
            Detected as installed PWA app - updates will refresh your installed version
          </div>

          {lastChecked && (
            <div className="text-xs text-center text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAVersionChecker; 