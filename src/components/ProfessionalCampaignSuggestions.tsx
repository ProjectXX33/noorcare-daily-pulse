import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  Users, 
  Zap,
  Globe,
  Star,
  Clock,
  Award,
  Shield,
  Heart,
  Brain,
  Activity,
  Moon
} from 'lucide-react';

// SAR Icon Component
const SARIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className || "riyal-svg"} 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 1124.14 1256.39" 
    width="14" 
    height="15.432" 
    style={{display:'inline-block', verticalAlign:'-0.125em'}}
  >
    <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
  </svg>
);

interface CampaignSuggestion {
  id: string;
  title: string;
  description: string;
  marketOpportunity: string;
  targetAudience: string;
  budgetRange: {
    min: number;
    recommended: number;
    max: number;
  };
  expectedROAS: number;
  duration: string;
  platforms: string[];
  keyStrategies: string[];
  marketData: {
    marketSize: string;
    growth: string;
    competition: string;
    demand: string;
  };
  islamicCompliance: string[];
  successFactors: string[];
  priority: 'high' | 'medium' | 'low';
  confidence: number;
}

const ProfessionalCampaignSuggestions: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('fitness');
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignSuggestion | null>(null);

  const campaignSuggestions: Record<string, CampaignSuggestion[]> = {
    fitness: [
      {
        id: 'protein-dominance',
        title: '🏋️ Protein Supplement Market Dominance',
        description: 'Target the fastest-growing supplement segment with personalized protein solutions for Saudi fitness enthusiasts',
        marketOpportunity: 'Protein supplements represent the fastest-growing segment in Saudi Arabia (2025-2030) with 30.3% of users being fitness enthusiasts',
        targetAudience: 'Gym-goers in Riyadh/Jeddah/Dammam (20-35 years), following fitness influencers like @MikeThurston',
        budgetRange: { min: 8000, recommended: 15000, max: 25000 },
        expectedROAS: 2.8,
        duration: '6-8 weeks',
        platforms: ['Instagram', 'TikTok', 'Snapchat', 'Google Ads'],
        keyStrategies: [
          'Partner with Saudi fitness influencers (3x higher engagement)',
          'Live workout demonstrations on TikTok Shop',
          'Arabic/English dual-language content',
          'Before/after transformation campaigns',
          'Halal whey/plant-based protein emphasis'
        ],
        marketData: {
          marketSize: '$1.2B+ protein segment',
          growth: '8.5% CAGR (2024-2030)',
          competition: 'Medium - opportunity for local brands',
          demand: 'High - 70% research supplements via Google'
        },
        islamicCompliance: [
          'Halal certification mandatory (65% purchase intent increase)',
          'Honest ingredient disclosure per Prophet\'s teachings',
          'No interest-based payment plans (Riba-free)',
          'Transparent pricing without gouging'
        ],
        successFactors: [
          'Science-backed content (76% demand clinical evidence)',
          'SFDA compliance for all health claims',
          'Subscription models (25% online buyers prefer)',
          'Mobile-first approach (80% traffic from smartphones)'
        ],
        priority: 'high',
        confidence: 92
      },
      {
        id: 'ramadan-fitness',
        title: '🌙 Ramadan Fitness & Energy Campaign',
        description: 'Capitalize on Ramadan health consciousness with Iftar-compatible energy supplements',
        marketOpportunity: 'Increased family spending during Ramadan with focus on health during fasting period',
        targetAudience: 'Health-conscious Muslims maintaining fitness during Ramadan (25-45 years)',
        budgetRange: { min: 12000, recommended: 20000, max: 35000 },
        expectedROAS: 3.2,
        duration: '6 weeks (Pre-Ramadan to Eid)',
        platforms: ['Instagram', 'Snapchat', 'TikTok', 'Google Ads'],
        keyStrategies: [
          'Iftar nutrition education content',
          'Suhoor energy supplement bundles',
          'Family health focus messaging',
          'Islamic values-aligned advertising',
          'Prayer-time sensitive ad scheduling'
        ],
        marketData: {
          marketSize: '$850M seasonal opportunity',
          growth: '12% during Ramadan period',
          competition: 'Low - untapped seasonal niche',
          demand: 'Very High - cultural significance'
        },
        islamicCompliance: [
          'Cultural sensitivity in all content',
          'Family-friendly messaging',
          'Respectful timing (avoid prayer times)',
          'Charity component (5% revenue to Sadaqah)'
        ],
        successFactors: [
          'Religious calendar alignment',
          'Family-oriented product bundling',
          'Educational content on fasting nutrition',
          'Community engagement through mosques'
        ],
        priority: 'high',
        confidence: 88
      }
    ],
    women: [
      {
        id: 'beauty-wellness',
        title: '👩 Beauty-from-Within Revolution',
        description: 'Target health-conscious Saudi women with beauty supplements using trusted micro-influencers',
        marketOpportunity: '82.8% of women in Riyadh use vitamins, with beauty supplements showing highest growth',
        targetAudience: 'Professional Saudi women 25-45, beauty-conscious, high disposable income',
        budgetRange: { min: 10000, recommended: 18000, max: 30000 },
        expectedROAS: 2.6,
        duration: '8 weeks',
        platforms: ['Instagram', 'Snapchat', 'TikTok'],
        keyStrategies: [
          'Micro-influencer partnerships (@SaudiDietitian - 50% higher credibility)',
          'Beauty transformation testimonials',
          'Collagen and Vitamin D focus (50% deficiency rate)',
          'Premium packaging for gifting',
          'Before/after UGC campaigns (30% retention increase)'
        ],
        marketData: {
          marketSize: '$950M women\'s supplements',
          growth: '7.2% CAGR',
          competition: 'High - premium positioning required',
          demand: 'High - beauty consciousness rising'
        },
        islamicCompliance: [
          'Private setting imagery for female-targeted ads',
          'Halal certification for all ingredients',
          'Modest advertising approach',
          'Female spokesperson preference'
        ],
        successFactors: [
          'Trust-building through testimonials',
          'Science-backed beauty claims',
          'Premium positioning strategy',
          'Subscription model implementation'
        ],
        priority: 'high',
        confidence: 85
      },
      {
        id: 'maternal-health',
        title: '🤱 Maternal & Prenatal Wellness',
        description: 'Comprehensive prenatal and postnatal supplement campaign for Saudi mothers',
        marketOpportunity: 'Growing awareness of maternal nutrition with government Vision 2030 health initiatives',
        targetAudience: 'Pregnant women and new mothers (22-40 years) in urban areas',
        budgetRange: { min: 6000, recommended: 12000, max: 20000 },
        expectedROAS: 2.4,
        duration: '10 weeks',
        platforms: ['Instagram', 'Facebook', 'Google Ads'],
        keyStrategies: [
          'Healthcare provider partnerships',
          'Educational content on maternal nutrition',
          'Folic acid and iron deficiency awareness',
          'Family planning clinic collaborations',
          'Postpartum recovery focus'
        ],
        marketData: {
          marketSize: '$420M maternal health segment',
          growth: '6.8% CAGR',
          competition: 'Medium - medical credibility crucial',
          demand: 'Steady - healthcare driven'
        },
        islamicCompliance: [
          'Family values emphasis',
          'Medical professional endorsements',
          'Conservative visual approach',
          'Health-first messaging'
        ],
        successFactors: [
          'Medical professional partnerships',
          'Educational content strategy',
          'Safety and quality emphasis',
          'Customer support for concerns'
        ],
        priority: 'medium',
        confidence: 78
      }
    ],
    professional: [
      {
        id: 'executive-energy',
        title: '💼 Executive Energy & Stress Management',
        description: 'Target high-earning professionals with premium stress relief and cognitive enhancement supplements',
        marketOpportunity: '82.1% of urban professionals seek energy boosters and stress relief solutions',
        targetAudience: 'Corporate executives and entrepreneurs (30-50 years) in Riyadh/Jeddah business districts',
        budgetRange: { min: 15000, recommended: 25000, max: 45000 },
        expectedROAS: 3.1,
        duration: '6 weeks',
        platforms: ['LinkedIn', 'Instagram', 'Google Ads'],
        keyStrategies: [
          'Executive lifestyle content',
          'Productivity enhancement focus',
          'Premium packaging and positioning',
          'Corporate wellness partnerships',
          'Nootropics and adaptogens emphasis'
        ],
        marketData: {
          marketSize: '$1.1B professional supplements',
          growth: '9.2% CAGR',
          competition: 'Medium - premium segment opportunity',
          demand: 'High - stress-driven demand'
        },
        islamicCompliance: [
          'Work-life balance messaging',
          'Professional imagery',
          'Quality and purity emphasis',
          'Transparent ingredient sourcing'
        ],
        successFactors: [
          'Premium positioning strategy',
          'Professional endorsements',
          'Convenience factor emphasis',
          'Corporate bulk ordering options'
        ],
        priority: 'high',
        confidence: 87
      }
    ],
    elderly: [
      {
        id: 'bone-joint-health',
        title: '🦴 Bone & Joint Health for Seniors',
        description: 'Target growing elderly population with comprehensive bone health solutions',
        marketOpportunity: '23.7% population will be >60 by 2050, with joint/bone health as primary concern',
        targetAudience: 'Saudi seniors 50+ years, especially women post-menopause',
        budgetRange: { min: 8000, recommended: 14000, max: 22000 },
        expectedROAS: 2.3,
        duration: '12 weeks',
        platforms: ['Facebook', 'WhatsApp', 'Google Ads'],
        keyStrategies: [
          'Educational content on osteoporosis prevention',
          'Calcium and Vitamin D3 focus',
          'Doctor testimonials and endorsements',
          'Family caregiver targeting',
          'Traditional Arabic messaging approach'
        ],
        marketData: {
          marketSize: '$680M elderly supplements',
          growth: '8.9% CAGR',
          competition: 'Low - underserved segment',
          demand: 'Growing - aging population'
        },
        islamicCompliance: [
          'Respectful elderly representation',
          'Family care values emphasis',
          'Conservative marketing approach',
          'Healthcare professional endorsements'
        ],
        successFactors: [
          'Medical credibility essential',
          'Family involvement in decision',
          'Clear health benefit communication',
          'Pharmacy partnership channels'
        ],
        priority: 'medium',
        confidence: 75
      }
    ]
  };

  const categories = [
    { id: 'fitness', name: 'Fitness & Sports', icon: Activity, count: campaignSuggestions.fitness?.length || 0 },
    { id: 'women', name: 'Women\'s Health', icon: Heart, count: campaignSuggestions.women?.length || 0 },
    { id: 'professional', name: 'Professional', icon: Brain, count: campaignSuggestions.professional?.length || 0 },
    { id: 'elderly', name: 'Senior Health', icon: Shield, count: campaignSuggestions.elderly?.length || 0 }
  ];

  const currentCampaigns = campaignSuggestions[selectedCategory] || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
          Professional Campaign Strategies
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Data-driven campaign suggestions for Saudi Arabia's $7.08B supplement market by 2030
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          <Badge className="bg-green-100 text-green-800">$4.8B Current Market</Badge>
          <Badge className="bg-blue-100 text-blue-800">6.7% CAGR Growth</Badge>
          <Badge className="bg-purple-100 text-purple-800">95% Internet Penetration</Badge>
        </div>
      </motion.div>

      {/* Category Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <Card
              key={category.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                selectedCategory === category.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <CardContent className="p-4 text-center">
                <IconComponent className={`h-8 w-8 mx-auto mb-2 ${
                  selectedCategory === category.id ? 'text-blue-600' : 'text-gray-600'
                }`} />
                <h3 className="font-semibold text-sm">{category.name}</h3>
                <p className="text-xs text-gray-500">{category.count} strategies</p>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Campaign Cards */}
      <motion.div
        key={selectedCategory}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {currentCampaigns.map((campaign, index) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getPriorityColor(campaign.priority)}>
                    {campaign.priority.toUpperCase()} PRIORITY
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-bold">{campaign.confidence}%</span>
                  </div>
                </div>
                <CardTitle className="text-lg line-clamp-2">{campaign.title}</CardTitle>
                <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Budget & ROAS */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Recommended Budget</p>
                    <p className="font-bold flex items-center gap-1">
                      {campaign.budgetRange.recommended.toLocaleString()}
                      <SARIcon className="h-3 w-3" />
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expected ROAS</p>
                    <p className="font-bold text-green-600">{campaign.expectedROAS}x</p>
                  </div>
                </div>

                {/* Market Data */}
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Market Opportunity:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-green-50 p-2 rounded">
                      <p className="font-medium">{campaign.marketData.marketSize}</p>
                      <p className="text-gray-600">Market Size</p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="font-medium">{campaign.marketData.growth}</p>
                      <p className="text-gray-600">Growth Rate</p>
                    </div>
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <p className="font-semibold text-sm mb-2">Key Platforms:</p>
                  <div className="flex flex-wrap gap-1">
                    {campaign.platforms.slice(0, 3).map((platform, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                    {campaign.platforms.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{campaign.platforms.length - 3}</Badge>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => setSelectedCampaign(campaign)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  View Full Strategy
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Detailed Campaign Modal */}
      <AnimatePresence>
        {selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedCampaign(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedCampaign.title}</h2>
                    <p className="text-purple-100">{selectedCampaign.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedCampaign(null)}
                    className="text-white hover:bg-white/20"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <Tabs defaultValue="overview" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="strategy">Strategy</TabsTrigger>
                    <TabsTrigger value="market">Market Data</TabsTrigger>
                    <TabsTrigger value="compliance">Compliance</TabsTrigger>
                    <TabsTrigger value="success">Success Factors</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Campaign Overview
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Priority</span>
                            <Badge className={getPriorityColor(selectedCampaign.priority)}>
                              {selectedCampaign.priority.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Confidence</span>
                            <span className="font-bold">{selectedCampaign.confidence}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Duration</span>
                            <span className="font-medium">{selectedCampaign.duration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Expected ROAS</span>
                            <span className="font-bold text-green-600">{selectedCampaign.expectedROAS}x</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Budget Planning
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Minimum</span>
                            <span className="font-medium flex items-center gap-1">
                              {selectedCampaign.budgetRange.min.toLocaleString()}
                              <SARIcon className="h-3 w-3" />
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Recommended</span>
                            <span className="font-bold flex items-center gap-1">
                              {selectedCampaign.budgetRange.recommended.toLocaleString()}
                              <SARIcon className="h-3 w-3" />
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Maximum</span>
                            <span className="font-medium flex items-center gap-1">
                              {selectedCampaign.budgetRange.max.toLocaleString()}
                              <SARIcon className="h-3 w-3" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Target Audience
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {selectedCampaign.targetAudience}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Market Opportunity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed">
                          {selectedCampaign.marketOpportunity}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="strategy" className="space-y-6">
                    <div className="grid gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Key Strategies
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {selectedCampaign.keyStrategies.map((strategy, index) => (
                              <li key={index} className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm mt-0.5">
                                  {index + 1}
                                </div>
                                <span className="text-gray-700">{strategy}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Platform Strategy
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {selectedCampaign.platforms.map((platform, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg text-center">
                                <p className="font-medium text-sm">{platform}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="market" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(selectedCampaign.marketData).map(([key, value]) => (
                        <Card key={key}>
                          <CardHeader>
                            <CardTitle className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-lg font-bold text-blue-600">{value}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="compliance" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Islamic Compliance Requirements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {selectedCampaign.islamicCompliance.map((item, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                              <span className="text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="success" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Success Factors
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {selectedCampaign.successFactors.map((factor, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <Star className="w-5 h-5 text-yellow-500 mt-0.5" />
                              <span className="text-gray-700">{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer */}
              <div className="p-6 border-t bg-gray-50 rounded-b-xl">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Professional strategy based on Saudi Arabia market analysis
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedCampaign(null)}
                    >
                      Close
                    </Button>
                    <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                      Create This Campaign
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfessionalCampaignSuggestions; 