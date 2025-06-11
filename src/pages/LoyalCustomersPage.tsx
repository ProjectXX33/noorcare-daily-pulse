import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Crown, Star, Award, Medal, Gem, Users, ShoppingCart, Calendar, MapPin, Phone, Mail, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useLoyalCustomers } from '@/contexts/LoyalCustomersContext';

// Saudi Riyal SVG Icon Component
const RiyalIcon = ({ className }: { className?: string }) => (
    <svg 
      className={className}
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1124.14 1256.39" 
    width="14" 
    height="15.432" 
      style={{ display: 'inline-block', verticalAlign: '-0.125em' }}
    >
    <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
    </svg>
  );

const LoyalCustomersPage = () => {
  const { 
    customers, 
    loading, 
    error, 
    progress, 
    stage, 
    details, 
    startFetching,
    clearData 
  } = useLoyalCustomers();

  // Debug logging to understand the issue
  React.useEffect(() => {
    console.log('🔍 LoyalCustomersPage mounted with state:', {
      loading,
      customersCount: customers.length,
      progress,
      stage
    });
  }, []);

  React.useEffect(() => {
    console.log('🔍 State changed:', {
      loading,
      customersCount: customers.length,
      progress,
      stage
    });
  }, [loading, customers.length, progress, stage]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
      
  const tiers = [
    { value: 'all', label: 'All Tiers', icon: Users, color: 'text-gray-600' },
    { value: 'Diamond', label: 'Diamond', icon: Gem, color: 'text-blue-600' },
    { value: 'Platinum', label: 'Platinum', icon: Crown, color: 'text-purple-600' },
    { value: 'Gold', label: 'Gold', icon: Award, color: 'text-yellow-600' },
    { value: 'Silver', label: 'Silver', icon: Medal, color: 'text-gray-500' },
    { value: 'Bronze', label: 'Bronze', icon: Star, color: 'text-orange-600' }
  ];

  const tierColors = {
    Diamond: 'bg-gradient-to-r from-blue-100 to-blue-50 border-blue-200 text-blue-800',
    Platinum: 'bg-gradient-to-r from-purple-100 to-purple-50 border-purple-200 text-purple-800',
    Gold: 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-200 text-yellow-800',
    Silver: 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200 text-gray-800',
    Bronze: 'bg-gradient-to-r from-orange-100 to-orange-50 border-orange-200 text-orange-800'
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Diamond': return Gem;
      case 'Platinum': return Crown;
      case 'Gold': return Award;
      case 'Silver': return Medal;
      case 'Bronze': return Star;
      default: return Star;
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.id.toString().includes(searchTerm);
    
    const matchesTier = selectedTier === 'all' || customer.loyalty_tier === selectedTier;
    
    return matchesSearch && matchesTier;
  });

  const exportToExcel = () => {
    try {
      if (filteredCustomers.length === 0) {
        toast.error('No customers to export');
        return;
      }

      const exportData = filteredCustomers.map((customer, index) => ({
        'Rank': index + 1,
        'Customer Name': customer.name,
        'Email': customer.email,
        'Phone': customer.phone || 'N/A',
        'Address': customer.address || 'N/A',
        'Total Spent (SAR)': customer.total_spent,
        'Orders Count': customer.orders_count,
        'Average Order Value (SAR)': customer.avg_order_value,
        'Loyalty Tier': customer.loyalty_tier,
        'First Order Date': customer.first_order_date,
        'Last Order Date': customer.last_order_date,
        'Customer ID': customer.id
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Top 100 Loyal Customers');

      const fileName = `top_100_loyal_customers_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success(`Successfully exported ${exportData.length} customers to Excel!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data to Excel');
    }
  };

  const getTierStats = () => {
    const stats = customers.reduce((acc, customer) => {
    acc[customer.loyalty_tier] = (acc[customer.loyalty_tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

    return stats;
  };

  const tierStats = getTierStats();
  const totalSpent = customers.reduce((sum, customer) => sum + customer.total_spent, 0);
  const totalOrders = customers.reduce((sum, customer) => sum + customer.orders_count, 0);

  if (error) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Users className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Customers</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={startFetching} variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={clearData} variant="ghost" className="w-full">
                  Clear Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (loading && customers.length === 0) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <Crown className="w-10 h-10 text-amber-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-amber-800 mb-2">
                Discovering Top 100 Loyal Customers
              </h3>
              <p className="text-amber-700 mb-6">
                {stage || 'Preparing to analyze latest customer data...'}
              </p>
              
              {progress > 0 && (
                <div className="mb-4 p-3 bg-amber-100 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-700">
                    <strong>⚡ Background Processing Active:</strong> This process started earlier and is continuing from where it left off.
                  </p>
                </div>
              )}
              
              <div className="w-full bg-amber-200 rounded-full h-3 mb-4 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              
              <div className="flex items-center justify-between text-sm text-amber-700 mb-4">
                <span>Progress</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              
              <p className="text-amber-600 text-sm">
                {details || 'Processing latest 5000 customers for comprehensive results...'}
              </p>
              
              <div className="mt-6 p-4 bg-amber-100 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700">
                  <strong>Background Processing:</strong> You can navigate to other pages - this will continue running in the background!
                </p>
                <p className="text-xs text-amber-600 mt-2 md:hidden">
                  📱 On mobile: Look for the floating progress circle on the right side of your screen when you navigate away.
                </p>
        </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Crown className="text-amber-500" />
            Top 100 Loyal Customers
          </h1>
          <p className="text-gray-600 mt-1">
            Ranked by total spending from latest 5000 customers • Real WooCommerce data
          </p>
          </div>
        
        <div className="flex gap-2">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 rounded-lg">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-amber-700">Updating...</span>
          </div>
          )}
          <Button 
            onClick={startFetching} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {loading ? 'Processing...' : 'Refresh Data'}
          </Button>
          <Button 
            onClick={exportToExcel} 
            className="bg-green-600 hover:bg-green-700"
            disabled={filteredCustomers.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      {customers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Total Customers</p>
                  <p className="text-2xl font-bold text-amber-800">{customers.length}</p>
              </div>
                <Users className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-800">{totalSpent.toLocaleString()} SAR</p>
              </div>
                <RiyalIcon className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-800">{totalOrders.toLocaleString()}</p>
              </div>
                <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Avg per Customer</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {customers.length > 0 ? Math.round(totalSpent / customers.length).toLocaleString() : 0} SAR
                  </p>
              </div>
                <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Filters and Tier Stats */}
      {customers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col lg:flex-row gap-4"
        >
          <Card className="flex-1">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
                <Input
                    placeholder="Search by name, email, phone, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                />
              </div>
                <div className="flex gap-2 flex-wrap">
                  {tiers.map((tier) => {
                    const TierIcon = tier.icon;
                    const count = tier.value === 'all' ? customers.length : tierStats[tier.value] || 0;
                    return (
              <Button
                        key={tier.value}
                        variant={selectedTier === tier.value ? "default" : "outline"}
                size="sm"
                        onClick={() => setSelectedTier(tier.value)}
                        className={`${selectedTier === tier.value ? '' : tier.color}`}
              >
                        <TierIcon className="w-4 h-4 mr-1" />
                        {tier.label} ({count})
              </Button>
                    );
                  })}
            </div>
          </div>
        </CardContent>
      </Card>
        </motion.div>
      )}

      {/* Customer List */}
      {customers.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid gap-4"
        >
          {filteredCustomers.length === 0 ? (
      <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No customers found</h3>
                <p className="text-gray-500">Try adjusting your search criteria or tier filter.</p>
              </CardContent>
            </Card>
          ) : (
            filteredCustomers.map((customer, index) => {
              const TierIcon = getTierIcon(customer.loyalty_tier);
              const tierColorClass = tierColors[customer.loyalty_tier];
              const rank = customers.findIndex(c => c.id === customer.id) + 1;
              
              return (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`hover:shadow-lg transition-all duration-200 ${tierColorClass} border-2`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-lg font-bold shadow-sm">
                              #{rank}
                            </div>
                            <Badge className={`mt-2 ${tierColorClass} border-0`}>
                              <TierIcon className="w-3 h-3 mr-1" />
                              {customer.loyalty_tier}
                            </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{customer.name}</h3>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                <span className="break-all">{customer.email}</span>
                      </div>
                        {customer.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              {customer.address && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{customer.address}</span>
                                </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                        <div className="flex flex-col lg:flex-row gap-4">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                            <div className="bg-white bg-opacity-50 rounded-lg p-3">
                              <p className="text-lg font-bold text-gray-900">{customer.total_spent.toLocaleString()}</p>
                              <p className="text-xs text-gray-600">SAR Spent</p>
                            </div>
                            <div className="bg-white bg-opacity-50 rounded-lg p-3">
                              <p className="text-lg font-bold text-gray-900">{customer.orders_count}</p>
                              <p className="text-xs text-gray-600">Orders</p>
                            </div>
                            <div className="bg-white bg-opacity-50 rounded-lg p-3">
                              <p className="text-lg font-bold text-gray-900">{customer.avg_order_value.toLocaleString()}</p>
                              <p className="text-xs text-gray-600">Avg SAR</p>
                            </div>
                            <div className="bg-white bg-opacity-50 rounded-lg p-3">
                              <div className="flex items-center gap-1 justify-center">
                                <Calendar className="w-3 h-3" />
                                <p className="text-xs text-gray-600">Since</p>
                     </div>
                              <p className="text-sm font-semibold text-gray-900">{customer.first_order_date}</p>
                     </div>
                     </div>
                  </div>
                </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </motion.div>
      ) : !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Card>
            <CardContent className="p-8">
              <Crown className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Load Top 100 Customer Data</h3>
              <p className="text-gray-600 mb-6">
                Click below to analyze latest 5000 customers from WooCommerce to find your top 100 loyal customers.
              </p>
              <Button onClick={startFetching} className="bg-amber-500 hover:bg-amber-600 text-white">
                <Users className="w-4 h-4 mr-2" />
                Load Top 100 Customer Data
              </Button>
        </CardContent>
      </Card>
        </motion.div>
      )}
    </div>
  );
};

export default LoyalCustomersPage; 