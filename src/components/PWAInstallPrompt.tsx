import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone, Monitor, TabletSmartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');
    setIsInstalled(isPWAInstalled);

    // Don't show if already installed
    if (isPWAInstalled) return;

    // Detect platform types
    const userAgent = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(userAgent);
    const android = /Android/.test(userAgent);
    const desktop = !iOS && !android && !/Mobile/.test(userAgent);

    setIsIOS(iOS);
    setIsAndroid(android);
    setIsDesktop(desktop);

    // Listen for the beforeinstallprompt event (mainly for Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
      console.log('PWA install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt with different timings based on platform
    let promptTimer: NodeJS.Timeout;

    if (iOS) {
      // iOS: Show after 15 seconds (reduced from 60 seconds)
      promptTimer = setTimeout(() => {
        setShowPrompt(true);
      }, 15000);
    } else if (android) {
      // Android: Show after 10 seconds if no beforeinstallprompt
      promptTimer = setTimeout(() => {
        if (!deferredPrompt) {
          setShowPrompt(true);
        }
      }, 10000);
    } else if (desktop) {
      // Desktop: Show after 20 seconds if no beforeinstallprompt
      promptTimer = setTimeout(() => {
        if (!deferredPrompt) {
          setShowPrompt(true);
        }
      }, 20000);
    }

    return () => {
      clearTimeout(promptTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowPrompt(false);
        }
      } catch (error) {
        console.error('Install prompt failed:', error);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 24 hours
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or dismissed recently
  if (isInstalled) return null;
  
  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  if (dismissedTime && Date.now() - parseInt(dismissedTime) < 24 * 60 * 60 * 1000) {
    return null;
  }

  if (!showPrompt) return null;

  // Get appropriate icon and messaging
  const getIcon = () => {
    if (isIOS) return <TabletSmartphone className="h-5 w-5 text-primary" />;
    if (isAndroid) return <Smartphone className="h-5 w-5 text-primary" />;
    if (isDesktop) return <Monitor className="h-5 w-5 text-primary" />;
    return <Smartphone className="h-5 w-5 text-primary" />;
  };

  const getTitle = () => {
    if (isIOS) return "Add to Home Screen";
    if (isAndroid) return "Install NoorHub App";
    if (isDesktop) return "Install NoorHub Desktop App";
    return "Install NoorHub App";
  };

  const getMessage = () => {
    if (isIOS) return "Add to Home Screen for a native app experience!";
    if (isAndroid) return "Install our app for faster access and offline support!";
    if (isDesktop) return "Install as a desktop app for quick access and better performance!";
    return "Install our app for a better experience!";
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-lg border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 md:left-auto md:right-4 md:max-w-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              {getIcon()}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">{getTitle()}</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {getMessage()}
              </p>
              
              {isIOS ? (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>1. Tap the Share button <span className="font-mono text-blue-600">↗</span></p>
                  <p>2. Select "Add to Home Screen"</p>
                  <p>3. Tap "Add"</p>
                </div>
              ) : (
                <Button 
                  onClick={handleInstallClick}
                  size="sm" 
                  className="w-full"
                  disabled={!deferredPrompt && !isDesktop && !isAndroid}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {deferredPrompt ? 'Install Now' : isDesktop ? 'Check Browser Menu' : 'Install App'}
                </Button>
              )}
              
              {/* Desktop/Android manual instructions if no native prompt */}
              {((isDesktop || isAndroid) && !deferredPrompt) && (
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  {isDesktop ? (
                    <>
                      <p>• Chrome: Menu → Install NoorHub</p>
                      <p>• Edge: Menu → Apps → Install this site</p>
                      <p>• Firefox: Address bar → Install</p>
                    </>
                  ) : (
                    <>
                      <p>• Chrome: Menu → Add to Home screen</p>
                      <p>• Samsung Internet: Menu → Add page to</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAInstallPrompt; 