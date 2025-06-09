import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Globe, Settings, TestTube } from 'lucide-react';
import { toast } from 'sonner';

const PWATestPanel: React.FC = () => {
  const [testVersion, setTestVersion] = useState('1.0.0');
  const [simulatePWA, setSimulatePWA] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const simulateVersionUpdate = () => {
    // Update the local version to be lower than server
    localStorage.setItem('app-version', testVersion);
    
    // Clear dismissal data
    localStorage.removeItem('dismissed-update');
    localStorage.removeItem('dismissal-time');
    
    toast.success(`Simulated version set to ${testVersion}`, {
      description: 'Refresh the page to trigger version check'
    });
  };

  const simulatePWAMode = () => {
    if (simulatePWA) {
      // Add PWA detection flags
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
      
      toast.success('PWA mode simulated', {
        description: 'App now thinks it\'s running as a PWA'
      });
    } else {
      toast.info('PWA simulation disabled');
    }
  };

  const resetAppData = () => {
    localStorage.removeItem('app-version');
    localStorage.removeItem('app-build-time');
    localStorage.removeItem('dismissed-update');
    localStorage.removeItem('dismissal-time');
    
    toast.success('App data reset', {
      description: 'All version and update data cleared'
    });
  };

  const getCurrentAppInfo = () => {
    const version = localStorage.getItem('app-version') || 'Not set';
    const buildTime = localStorage.getItem('app-build-time') || 'Not set';
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    
    return { version, buildTime, isPWA };
  };

  const appInfo = getCurrentAppInfo();

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-yellow-50 border-yellow-200 text-yellow-800"
        >
          <TestTube className="h-4 w-4 mr-2" />
          PWA Test
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 shadow-2xl border-yellow-200 bg-yellow-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg text-yellow-800">PWA Test Panel</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          <CardDescription className="text-yellow-700">
            Development testing tools
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Current App Info */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-yellow-800">Current App Status</Label>
            <div className="bg-white rounded p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Version:</span>
                <Badge variant="outline">{appInfo.version}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Build Time:</span>
                <span className="text-muted-foreground">{appInfo.buildTime}</span>
              </div>
              <div className="flex justify-between">
                <span>PWA Mode:</span>
                <div className="flex items-center gap-1">
                  {appInfo.isPWA ? (
                    <Smartphone className="h-3 w-3 text-green-600" />
                  ) : (
                    <Globe className="h-3 w-3 text-blue-600" />
                  )}
                  <span>{appInfo.isPWA ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Version Simulation */}
          <div className="space-y-2">
            <Label htmlFor="test-version" className="text-sm font-semibold text-yellow-800">
              Simulate Version
            </Label>
            <div className="flex gap-2">
              <Input
                id="test-version"
                value={testVersion}
                onChange={(e) => setTestVersion(e.target.value)}
                placeholder="e.g., 1.0.0"
                className="flex-1"
              />
              <Button size="sm" onClick={simulateVersionUpdate}>
                Set
              </Button>
            </div>
            <p className="text-xs text-yellow-700">
              Set a version lower than 1.0.1 to trigger update prompt
            </p>
          </div>

          {/* PWA Simulation */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold text-yellow-800">Simulate PWA</Label>
              <p className="text-xs text-yellow-700">Force PWA detection</p>
            </div>
            <Switch
              checked={simulatePWA}
              onCheckedChange={(checked) => {
                setSimulatePWA(checked);
                if (checked) simulatePWAMode();
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={resetAppData}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Reset App Data
            </Button>
            
            <Button 
              onClick={() => window.location.reload()}
              size="sm"
              className="w-full"
            >
              Reload Page
            </Button>
          </div>

          <div className="text-xs text-center text-yellow-600 border-t border-yellow-200 pt-2">
            This panel only appears in development mode
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWATestPanel; 