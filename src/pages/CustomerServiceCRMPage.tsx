import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  AlertCircle,
  Globe,
  Lock,
  MessageSquare,
  Users,
  Hash,
  Camera,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerServiceCRMPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // CRM Platform URLs
  const platforms = [
    {
      id: 'morasalaty',
      name: 'Morasalaty CRM',
      description: 'منصة مراسلاتي - Social Media Management Platform',
      url: 'https://crm.morasalaty.net/',
      icon: Globe,
      color: 'emerald',
      features: ['Chat Management', 'Customer Data', 'Social Media Tools']
    },
    {
      id: 'facebook',
      name: 'Facebook & Instagram',
      description: 'Meta Business Suite - Messages & Comments',
      url: 'https://business.facebook.com/latest/inbox/all/?business_id=314218114016188&asset_id=331283840619411&mailbox_id=331283840619411&selected_item_id=100016530844731&thread_type=FB_MESSAGE',
      icon: MessageSquare,
      color: 'blue',
      features: ['Facebook Messages', 'Instagram DMs', 'Comments Management']
    }
  ];

  // Strict access control - redirect if not Customer Service
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.position !== 'Junior CRM Specialist') {
      console.warn('Access denied: User is not Customer Service');
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  // Function to open platform in new tab
  const openPlatform = (url: string, platformName: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    console.log(`Opening ${platformName} in new tab:`, url);
  };

  // Don't render page content if user is not Customer Service
      if (!user) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                  <h3 className="text-lg font-semibold">Access Restricted</h3>
                  <p className="text-gray-600">
                    Please log in to access this page.
                  </p>
                  <Button onClick={() => navigate('/login')} className="w-full">
                    Go to Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
      
      if (user.position !== 'Junior CRM Specialist') {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/98 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Social Media CRM
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Customer Relationship Management Platforms
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="w-fit">
                <Lock className="h-3 w-3 mr-1" />
                Customer Service Only
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                <Zap className="h-3 w-3 mr-1" />
                {platforms.length} Platforms Available
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
          {platforms.map((platform) => {
            const IconComponent = platform.icon;
            const colorClasses = platform.color === 'emerald' 
              ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
              : 'bg-blue-50 border-blue-200 hover:bg-blue-100';
            const iconColorClasses = platform.color === 'emerald'
              ? 'text-emerald-600 bg-emerald-100'
              : 'text-blue-600 bg-blue-100';
            const badgeColorClasses = platform.color === 'emerald'
              ? 'text-emerald-600 border-emerald-300'
              : 'text-blue-600 border-blue-300';

            return (
              <Card 
                key={platform.id} 
                className={`${colorClasses} transition-all duration-200 cursor-pointer group border-2`}
                onClick={() => openPlatform(platform.url, platform.name)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${iconColorClasses}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold group-hover:text-foreground/80">
                          {platform.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {platform.description}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-foreground/80 transition-colors" />
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Features */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground/80">Features:</h4>
                      <div className="flex flex-wrap gap-2">
                        {platform.features.map((feature, index) => (
                          <Badge 
                            key={index}
                            variant="outline" 
                            className={`text-xs ${badgeColorClasses}`}
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className={`w-full ${
                        platform.color === 'emerald' 
                          ? 'bg-emerald-600 hover:bg-emerald-700' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white group-hover:scale-105 transition-transform`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openPlatform(platform.url, platform.name);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open {platform.name}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Instructions Card */}
        <Card className="mt-8 max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <MessageSquare className="h-5 w-5" />
              Quick Access Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-blue-800">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 mt-0.5">1</div>
                <p><strong>Click any platform card</strong> to open it in a new tab</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 mt-0.5">2</div>
                <p><strong>Login with your credentials</strong> in each platform</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 mt-0.5">3</div>
                <p><strong>Bookmark important pages</strong> for quick future access</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 mt-0.5">4</div>
                <p><strong>Keep tabs open</strong> while working for seamless workflow</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerServiceCRMPage; 