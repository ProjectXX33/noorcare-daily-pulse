import React, { useState, useEffect } from 'react';
import { Smartphone, X, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { pwaUpdateHelper } from '@/utils/pwaUpdateHelper';

const PWAUpdateInstructions: React.FC = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    // Check if we should show PWA update instructions
    if (pwaUpdateHelper.shouldShowUpdateInstructions()) {
      setInstructions(pwaUpdateHelper.getUpdateInstructions());
      setShowInstructions(true);
    }
  }, []);

  const handleDismiss = () => {
    pwaUpdateHelper.markInstructionsShown();
    setShowInstructions(false);
  };

  const handleCloseApp = () => {
    // Try to close the PWA window/app
    if (window.close) {
      window.close();
    } else {
      // Fallback: Show additional instructions
      alert('Please close this app manually and reopen from your home screen/apps menu.');
    }
    handleDismiss();
  };

  if (!showInstructions || !pwaUpdateHelper.isPWA()) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-2 border-green-200 bg-green-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-green-800">Update Completed!</CardTitle>
                <CardDescription className="text-green-700">
                  PWA files updated successfully
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 text-green-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <Smartphone className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              To see the new version in your PWA, please follow these steps:
            </AlertDescription>
          </Alert>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <pre className="text-sm text-green-800 whitespace-pre-wrap font-medium">
              {instructions}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleCloseApp}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Close & Restart App
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              className="px-4 border-green-300 text-green-700 hover:bg-green-100"
            >
              Later
            </Button>
          </div>

          <div className="text-xs text-center text-green-600 bg-green-100 rounded p-2">
            💡 The app icon and info will show the new version number after restart
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAUpdateInstructions; 