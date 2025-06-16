import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  AlertCircle,
  Globe,
  Lock,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerServiceCRMPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [iframeError, setIframeError] = useState(false);
  
  const crmUrl = 'https://crm.morasalaty.net/';

  // Strict access control - redirect if not Customer Service
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.position !== 'Customer Service') {
      console.warn('Access denied: User is not Customer Service');
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  // Don't render page content if user is not Customer Service
  if (!user || user.position !== 'Customer Service') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
              <h3 className="text-lg font-semibold">Access Restricted</h3>
              <p className="text-gray-600">
                This page is only accessible to Customer Service representatives.
              </p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeError(false); // Reset error state
    
    setTimeout(() => {
      setIsLoading(false);
      // Refresh the iframe by changing its src
      const iframe = document.getElementById('crm-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = crmUrl + '?t=' + Date.now(); // Add timestamp to force reload
      }
    }, 1000);
  };

  const handleTryEmbed = () => {
    setIframeError(false);
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const openInNewTab = () => {
    window.open(crmUrl, '_blank', 'noopener,noreferrer');
  };

  const handleIframeError = () => {
    setIframeError(true);
  };

  // Try to load the iframe first, fallback to external if it fails
  React.useEffect(() => {
    // Give the iframe some time to load before showing fallback
    const timer = setTimeout(() => {
      setIframeError(true);
    }, 5000); // Wait 5 seconds before showing fallback

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/98 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Globe className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    CRM System
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    منصة مراسلاتي - Customer Relationship Management
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="w-fit">
                <Lock className="h-3 w-3 mr-1" />
                Customer Service Only
              </Badge>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('desktop')}
                  className="h-8 px-3"
                >
                  <Monitor className="h-4 w-4 mr-1" />
                  Desktop
                </Button>
                <Button
                  variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('mobile')}
                  className="h-8 px-3"
                >
                  <Smartphone className="h-4 w-4 mr-1" />
                  Mobile
                </Button>
              </div>
              
              {/* Action Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-8"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="h-8"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                New Tab
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CRM Web View */}
      <div className="p-4 sm:p-6 lg:p-8">
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-emerald-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-emerald-800">
                <Zap className="h-5 w-5" />
                CRM Interface - منصة مراسلاتي
              </CardTitle>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                Live System
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
                  <p className="text-sm text-muted-foreground">Refreshing CRM system...</p>
                </div>
              </div>
            )}
            
            {/* External Access State - Professional approach */}
            {iframeError ? (
              <div className="flex flex-col items-center justify-center p-12 min-h-[400px] bg-gradient-to-br from-emerald-50 to-blue-50">
                <div className="text-center max-w-md space-y-6">
                  <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                    <Globe className="h-10 w-10 text-emerald-600" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-emerald-900">
                      External CRM Access
                    </h3>
                    <p className="text-emerald-700 leading-relaxed">
                      For security and optimal performance, the CRM system opens in a dedicated tab. 
                      This ensures full functionality and protects your data.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleTryEmbed}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                      >
                        <RefreshCw className="h-5 w-5 mr-2" />
                        Try Embed Again
                      </Button>
                      <Button 
                        onClick={openInNewTab}
                        variant="outline"
                        size="lg"
                        className="flex-1"
                      >
                        <ExternalLink className="h-5 w-5 mr-2" />
                        New Tab
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 justify-center">
                      <Globe className="h-4 w-4" />
                      <span>crm.morasalaty.net</span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                    <h4 className="font-medium text-blue-900 mb-2">Quick Access Instructions:</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Click "Open CRM in New Tab" above</li>
                      <li>Bookmark the CRM page for quick access</li>
                      <li>Login with your credentials</li>
                      <li>Keep the tab open while working</li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              /* iframe Container - Still try to load initially */
              <div className={`relative bg-white ${
                viewMode === 'mobile' 
                  ? 'max-w-md mx-auto' 
                  : 'w-full'
              }`}>
                <iframe
                  id="crm-iframe"
                  src={crmUrl}
                  className={`w-full border-0 ${
                    viewMode === 'mobile' 
                      ? 'h-[800px]' 
                      : 'h-[calc(100vh-200px)] min-h-[600px]'
                  }`}
                  title="CRM System - منصة مراسلاتي"
                  allow="camera; microphone; clipboard-read; clipboard-write; geolocation"
                  loading="eager"
                  onLoad={() => {
                    console.log('CRM iframe loaded successfully');
                    setIframeError(false);
                  }}
                  onError={handleIframeError}
                  style={{
                    transform: viewMode === 'mobile' ? 'scale(0.8)' : 'scale(1)',
                    transformOrigin: 'top left',
                    width: viewMode === 'mobile' ? '125%' : '100%',
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quick Info */}
        <Card className="mt-4 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="font-medium text-blue-900">CRM System Information</h4>
                <p className="text-sm text-blue-700">
                  This is the منصة مراسلاتي (Morasalaty Platform) CRM system for managing customer relationships 
                  and social media communications. Use this tool to handle customer inquiries, track interactions, 
                  and manage customer data efficiently.
                </p>
                {iframeError && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                    <strong>Secure Access:</strong> This CRM opens in a dedicated tab for enhanced security and full functionality. 
                    This is the recommended approach for external business systems.
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">Arabic Interface</Badge>
                  <Badge variant="outline" className="text-xs">Social Media CRM</Badge>
                  <Badge variant="outline" className="text-xs">Customer Management</Badge>
                  {iframeError && <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800">External Access</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerServiceCRMPage; 