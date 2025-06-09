// PWA Update Helper - Forces installed PWA to recognize new versions
export class PWAUpdateHelper {
  private static instance: PWAUpdateHelper;
  
  static getInstance(): PWAUpdateHelper {
    if (!PWAUpdateHelper.instance) {
      PWAUpdateHelper.instance = new PWAUpdateHelper();
    }
    return PWAUpdateHelper.instance;
  }

  // Check if running as PWA
  isPWA(): boolean {
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const iOSStandalone = (window.navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');
    
    return standaloneMode || iOSStandalone || isAndroidApp;
  }

  // Force PWA to update its metadata and reinstall
  async forcePWAUpdate(newVersion: string): Promise<void> {
    try {
      console.log('[PWAUpdateHelper] Forcing PWA update for version:', newVersion);
      
      // 1. Clear all app caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[PWAUpdateHelper] Cleared all caches');
      }

      // 2. Update manifest cache
      await this.updateManifestCache();

      // 3. Clear service worker and force update
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          // Unregister current service worker
          await registration.unregister();
          console.log('[PWAUpdateHelper] Service worker unregistered');
          
          // Re-register with new version
          await navigator.serviceWorker.register('/sw.js');
          console.log('[PWAUpdateHelper] Service worker re-registered');
        }
      }

      // 4. Clear all localStorage except user preferences
      this.clearStorageForUpdate();

      // 5. Update version tracking
      localStorage.setItem('app-version', newVersion);
      localStorage.setItem('pwa-last-update', Date.now().toString());

      // 6. Show update instruction to user
      this.showPWAUpdateInstructions(newVersion);

    } catch (error) {
      console.error('[PWAUpdateHelper] Error during PWA update:', error);
      throw error;
    }
  }

  // Update manifest cache to force PWA to recognize new version
  private async updateManifestCache(): Promise<void> {
    try {
      // Force fetch new manifest with cache busting
      const cacheBuster = Date.now();
      const response = await fetch(`/manifest.json?v=${cacheBuster}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const manifest = await response.json();
        console.log('[PWAUpdateHelper] New manifest loaded:', manifest.name);
        
        // Store new manifest data
        localStorage.setItem('cached-manifest', JSON.stringify(manifest));
      }
    } catch (error) {
      console.error('[PWAUpdateHelper] Error updating manifest cache:', error);
    }
  }

  // Clear storage but preserve user preferences
  private clearStorageForUpdate(): void {
    const preserve = ['theme', 'language', 'chatSoundEnabled', 'app-version', 'pwa-last-update'];
    const toPreserve: { [key: string]: string } = {};

    // Save values to preserve
    preserve.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        toPreserve[key] = value;
      }
    });

    // Clear all localStorage
    localStorage.clear();

    // Restore preserved values
    Object.entries(toPreserve).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    // Clear sessionStorage completely
    sessionStorage.clear();

    console.log('[PWAUpdateHelper] Storage cleared for update');
  }

  // Show instructions for PWA update
  private showPWAUpdateInstructions(version: string): void {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let instructions = '';
    
    if (isIOS) {
      instructions = `
        📱 To complete the PWA update:
        1. Close this app completely
        2. Go to your home screen
        3. Open NoorHub again
        4. The app icon and info will show v${version}
      `;
    } else if (isAndroid) {
      instructions = `
        📱 To complete the PWA update:
        1. Close this app completely
        2. Clear app from recent apps
        3. Open NoorHub from home screen
        4. App will display new version v${version}
      `;
    } else {
      instructions = `
        💻 To complete the PWA update:
        1. Close this window/app
        2. Reopen NoorHub from your apps
        3. App will display new version v${version}
      `;
    }

    // Store instructions for display
    localStorage.setItem('pwa-update-instructions', instructions);
    localStorage.setItem('pwa-update-pending', 'true');
  }

  // Check if PWA update instructions should be shown
  shouldShowUpdateInstructions(): boolean {
    return localStorage.getItem('pwa-update-pending') === 'true';
  }

  // Get stored update instructions
  getUpdateInstructions(): string {
    return localStorage.getItem('pwa-update-instructions') || '';
  }

  // Mark update instructions as shown
  markInstructionsShown(): void {
    localStorage.removeItem('pwa-update-pending');
    localStorage.removeItem('pwa-update-instructions');
  }

  // Get current PWA version from manifest or storage
  getCurrentPWAVersion(): string {
    const storedVersion = localStorage.getItem('app-version');
    const manifest = localStorage.getItem('cached-manifest');
    
    if (manifest) {
      try {
        const manifestData = JSON.parse(manifest);
        return manifestData.version || storedVersion || '1.0.0';
      } catch {
        return storedVersion || '1.0.0';
      }
    }
    
    return storedVersion || '1.0.0';
  }

  // Check if this is a fresh PWA install
  isFreshPWAInstall(): boolean {
    const hasVersion = localStorage.getItem('app-version');
    const hasManifest = localStorage.getItem('cached-manifest');
    
    return this.isPWA() && !hasVersion && !hasManifest;
  }

  // Initialize PWA version tracking
  initializePWATracking(version: string): void {
    if (this.isPWA()) {
      localStorage.setItem('app-version', version);
      localStorage.setItem('pwa-first-install', Date.now().toString());
      console.log('[PWAUpdateHelper] PWA tracking initialized for version:', version);
    }
  }
}

// Export singleton instance
export const pwaUpdateHelper = PWAUpdateHelper.getInstance(); 