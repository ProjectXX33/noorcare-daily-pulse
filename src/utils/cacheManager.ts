// Cache Management Utility for NoorHub App
export class CacheManager {
  private static instance: CacheManager;
  private currentVersion: string;
  private cachePrefix = 'noorhub-';

  constructor() {
    this.currentVersion = this.getCurrentVersion();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Get current app version from various sources
  private getCurrentVersion(): string {
    // Try to get version from service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Version will be communicated via postMessage
      return localStorage.getItem('app-version') || '1.0.0';
    }
    
    // Try to get from build time
    const buildTime = document.querySelector('meta[name="build-time"]')?.getAttribute('content');
    if (buildTime) {
      return `1.0.${buildTime}`;
    }
    
    return '1.0.0';
  }

  // Clear all application caches
  async clearAllCaches(): Promise<boolean> {
    try {
      console.log('[CacheManager] Starting cache clearing process...');
      
      // Clear browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('[CacheManager] Found caches:', cacheNames);
        
        const deletePromises = cacheNames.map(cacheName => {
          console.log(`[CacheManager] Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        });
        
        await Promise.all(deletePromises);
        console.log('[CacheManager] All caches deleted successfully');
      }

      // Clear localStorage (except user preferences and auth data)
      const preserveKeys = [
        'theme', 
        'language', 
        'chatSoundEnabled',
        'app-version',
        'dismissed-update-version',
        'dismissed-update-time',
        'last-update-check',
        'update-completed',
        'update-completed-time'
      ];
      
      // Preserve all authentication keys
      const allKeys = Object.keys(localStorage);
      const authKeys = allKeys.filter(key => 
        key.includes('sb-') ||
        key.includes('supabase') ||
        key.includes('auth') ||
        key.includes('session') ||
        key.includes('user')
      );
      
      preserveKeys.push(...authKeys);
      this.clearLocalStorage(preserveKeys);

      // Clear sessionStorage
      sessionStorage.clear();
      console.log('[CacheManager] Session storage cleared');

      // Clear IndexedDB if used
      await this.clearIndexedDB();

      return true;
    } catch (error) {
      console.error('[CacheManager] Error clearing caches:', error);
      return false;
    }
  }

  // Clear localStorage with preserved keys
  private clearLocalStorage(preserveKeys: string[] = []): void {
    try {
      const preserved: { [key: string]: string } = {};
      
      // Save values to preserve
      preserveKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
          preserved[key] = value;
        }
      });

      // Clear all localStorage
      localStorage.clear();

      // Restore preserved values
      Object.entries(preserved).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      console.log('[CacheManager] LocalStorage cleared (preserved:', preserveKeys, ')');
    } catch (error) {
      console.error('[CacheManager] Error clearing localStorage:', error);
    }
  }

  // Clear IndexedDB databases
  private async clearIndexedDB(): Promise<void> {
    try {
      if ('indexedDB' in window) {
        // Get all database names (this might not work in all browsers)
        const databases = await indexedDB.databases();
        
        const deletePromises = databases.map(db => {
          if (db.name && db.name.includes('noorhub')) {
            return new Promise<void>((resolve, reject) => {
              const deleteRequest = indexedDB.deleteDatabase(db.name!);
              deleteRequest.onsuccess = () => resolve();
              deleteRequest.onerror = () => reject(deleteRequest.error);
            });
          }
          return Promise.resolve();
        });

        await Promise.all(deletePromises);
        console.log('[CacheManager] IndexedDB cleared');
      }
    } catch (error) {
      console.log('[CacheManager] IndexedDB clearing not supported or failed:', error);
    }
  }

  // Check if update is needed
  async checkForUpdate(): Promise<{ updateAvailable: boolean; newVersion?: string }> {
    try {
      // Check service worker for updates
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          
          if (registration.waiting) {
            return { updateAvailable: true, newVersion: 'Latest' };
          }
        }
      }

      // Check build time
      const buildTime = document.querySelector('meta[name="build-time"]')?.getAttribute('content');
      const storedBuildTime = localStorage.getItem('app-build-time');
      
      if (buildTime && storedBuildTime && buildTime !== storedBuildTime) {
        return { updateAvailable: true, newVersion: `1.0.${buildTime}` };
      }

      return { updateAvailable: false };
    } catch (error) {
      console.error('[CacheManager] Error checking for updates:', error);
      return { updateAvailable: false };
    }
  }

  // Force app refresh with cache clearing
  async forceRefresh(): Promise<void> {
    try {
      console.log('[CacheManager] Starting force refresh...');
      
      // Clear all caches first
      await this.clearAllCaches();
      
      // Skip waiting for new service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Wait a bit for the new SW to take control
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Hard reload the page
      window.location.reload();
      
    } catch (error) {
      console.error('[CacheManager] Error during force refresh:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  }

  // Get cache size information
  async getCacheInfo(): Promise<{ totalSize: number; cacheCount: number; caches: string[] }> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        
        // Calculate total cache size (approximation)
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          totalSize += requests.length; // Approximate size based on request count
        }
        
        return {
          totalSize,
          cacheCount: cacheNames.length,
          caches: cacheNames
        };
      }
      
      return { totalSize: 0, cacheCount: 0, caches: [] };
    } catch (error) {
      console.error('[CacheManager] Error getting cache info:', error);
      return { totalSize: 0, cacheCount: 0, caches: [] };
    }
  }

  // Set current version
  setVersion(version: string): void {
    this.currentVersion = version;
    localStorage.setItem('app-version', version);
  }

  // Get current version
  getVersion(): string {
    return this.currentVersion;
  }

  // Check if this is a fresh install
  isFreshInstall(): boolean {
    return !localStorage.getItem('app-version') && !localStorage.getItem('app-build-time');
  }

  // Mark app as updated
  markAsUpdated(version: string): void {
    const buildTime = document.querySelector('meta[name="build-time"]')?.getAttribute('content');
    
    this.setVersion(version);
    if (buildTime) {
      localStorage.setItem('app-build-time', buildTime);
    }
    localStorage.setItem('last-update-check', Date.now().toString());
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance(); 