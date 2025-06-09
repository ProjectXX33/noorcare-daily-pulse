import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Crown, 
  Star, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Search,
  Trophy,
  Medal,
  Award,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Filter,
  Download,
  Loader2
} from 'lucide-react';
import wooCommerceAPI, { isWooCommerceConfigured } from '@/lib/woocommerceApi';

interface LoyalCustomer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  total_spent: number;
  orders_count: number;
  avg_order_value: number;
  first_order_date: string;
  last_order_date: string;
  loyalty_tier: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  avatar?: string;
}

const LoyalCustomersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Strict access control - redirect if not Customer Service
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    if (user.position !== 'Customer Service') {
      console.warn('Access denied: User is not Customer Service');
      navigate(user.role === 'admin' ? '/dashboard' : '/employee-dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  // Don't render page content if user is not Customer Service
  if (!user || user.position !== 'Customer Service') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  const [customers, setCustomers] = useState<LoyalCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<LoyalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'spending' | 'orders' | 'avg_order'>('spending');

  // Determine loyalty tier based on spending and orders
  const determineLoyaltyTier = (totalSpent: number, ordersCount: number): LoyalCustomer['loyalty_tier'] => {
    if (totalSpent >= 5000 && ordersCount >= 20) return 'Diamond';
    if (totalSpent >= 3000 && ordersCount >= 15) return 'Platinum';
    if (totalSpent >= 1500 && ordersCount >= 10) return 'Gold';
    if (totalSpent >= 500 && ordersCount >= 5) return 'Silver';
    return 'Bronze';
  };

  // Get tier color and icon
  const getTierInfo = (tier: LoyalCustomer['loyalty_tier']) => {
    switch (tier) {
      case 'Diamond': return { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Crown };
      case 'Platinum': return { color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Trophy };
      case 'Gold': return { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Medal };
      case 'Silver': return { color: 'text-slate-600 bg-slate-50 border-slate-200', icon: Award };
      case 'Bronze': return { color: 'text-orange-600 bg-orange-50 border-orange-200', icon: Star };
    }
  };

  // Saudi Riyal SVG Component
  const SaudiRiyalIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg 
      className={className}
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1124.14 1256.39" 
      width="20" 
      height="22" 
      style={{ display: 'inline-block', verticalAlign: '-0.125em' }}
    >
      <path 
        fill="currentColor" 
        d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"
      />
      <path 
        fill="currentColor" 
        d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"
      />
    </svg>
  );

  // Fetch customer data
  useEffect(() => {
    const fetchCustomerData = async () => {
      setLoading(true);
      try {
        if (isWooCommerceConfigured()) {
          // For now, we'll generate mock data since WooCommerce customer API requires additional setup
          // In production, you would fetch real customer data from WooCommerce
          console.log('Generating loyalty customer analytics...');
          generateMockCustomers();
        } else {
          console.log('Using mock customer data...');
          generateMockCustomers();
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
        toast.error('Failed to load customer data');
        generateMockCustomers();
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, []);

  // Generate mock customer data for demonstration
  const generateMockCustomers = () => {
    const mockCustomers: LoyalCustomer[] = Array.from({ length: 50 }, (_, index) => {
      const totalSpent = Math.random() * 8000 + 200; // 200-8200 SAR
      const ordersCount = Math.floor(Math.random() * 25) + 1; // 1-25 orders
      const avgOrderValue = totalSpent / ordersCount;
      
      const firstNames = ['Ahmed', 'Mohammed', 'Abdullah', 'Omar', 'Khalid', 'Faisal', 'Nasser', 'Salem', 'Fahad', 'Turki'];
      const lastNames = ['Al-Rashid', 'Al-Otaibi', 'Al-Ghamdi', 'Al-Harbi', 'Al-Malki', 'Al-Zahrani', 'Al-Dosari', 'Al-Shehri', 'Al-Qahtani', 'Al-Mutairi'];
      
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      return {
        id: index + 1,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace('al-', '')}@email.com`,
        phone: `+966 5${Math.floor(Math.random() * 90000000) + 10000000}`,
        address: `Riyadh, Saudi Arabia`,
        total_spent: Math.round(totalSpent),
        orders_count: ordersCount,
        avg_order_value: Math.round(avgOrderValue),
        first_order_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        last_order_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        loyalty_tier: determineLoyaltyTier(totalSpent, ordersCount)
      };
    });

    // Sort by total spent (highest first)
    const sortedCustomers = mockCustomers.sort((a, b) => b.total_spent - a.total_spent);
    setCustomers(sortedCustomers);
    setFilteredCustomers(sortedCustomers);
  };

  // Filter and sort customers
  useEffect(() => {
    let filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)
    );

    // Sort customers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'spending': return b.total_spent - a.total_spent;
        case 'orders': return b.orders_count - a.orders_count;
        case 'avg_order': return b.avg_order_value - a.avg_order_value;
        default: return b.total_spent - a.total_spent;
      }
    });

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, sortBy]);

  // Calculate summary stats
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.total_spent, 0);
  const totalOrders = customers.reduce((sum, customer) => sum + customer.orders_count, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Get tier distribution
  const tierDistribution = customers.reduce((acc, customer) => {
    acc[customer.loyalty_tier] = (acc[customer.loyalty_tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading loyal customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-2 sm:p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent truncate">
              Top Loyal Customers
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Track and analyze your most valuable customers</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 md:mb-6">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Customers</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-600">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <SaudiRiyalIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">{totalRevenue.toLocaleString()} SAR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Orders</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Order Value</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-600">{Math.round(avgOrderValue)} SAR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-4 md:mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sortBy === 'spending' ? 'default' : 'outline'}
                onClick={() => setSortBy('spending')}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2"
                size="sm"
              >
                <SaudiRiyalIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">By Spending</span>
                <span className="sm:hidden">Spending</span>
              </Button>
              <Button
                variant={sortBy === 'orders' ? 'default' : 'outline'}
                onClick={() => setSortBy('orders')}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2"
                size="sm"
              >
                <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">By Orders</span>
                <span className="sm:hidden">Orders</span>
              </Button>
              <Button
                variant={sortBy === 'avg_order' ? 'default' : 'outline'}
                onClick={() => setSortBy('avg_order')}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2"
                size="sm"
              >
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">By AOV</span>
                <span className="sm:hidden">AOV</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loyalty Tier Distribution */}
      <Card className="mb-4 md:mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Loyalty Tier Distribution</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Customer distribution across loyalty tiers</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
            {['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze'].map((tier) => {
              const tierInfo = getTierInfo(tier as LoyalCustomer['loyalty_tier']);
              const TierIcon = tierInfo.icon;
              const count = tierDistribution[tier] || 0;
              
              return (
                <div key={tier} className={`p-2 sm:p-4 rounded-lg border ${tierInfo.color} text-center`}>
                  <TierIcon className="h-4 w-4 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2" />
                  <p className="font-semibold text-xs sm:text-sm">{tier}</p>
                  <p className="text-lg sm:text-2xl font-bold">{count}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">Top Loyal Customers</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Showing {filteredCustomers.length} customers sorted by {sortBy}
              </CardDescription>
            </div>
            <Button variant="outline" className="flex items-center gap-2 self-start sm:self-auto" size="sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Export</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 sm:space-y-4">
            {filteredCustomers.slice(0, 50).map((customer, index) => {
              const tierInfo = getTierInfo(customer.loyalty_tier);
              const TierIcon = tierInfo.icon;
              
              return (
                <div key={customer.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <span className={`text-sm sm:text-lg font-bold w-6 sm:w-8 text-center ${
                        index === 0 ? 'text-amber-600' : 
                        index === 1 ? 'text-gray-600' : 
                        index === 2 ? 'text-orange-600' : 'text-muted-foreground'
                      }`}>
                        #{index + 1}
                      </span>
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-600 font-semibold text-xs sm:text-sm">
                          {customer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{customer.name}</h3>
                        <Badge variant="secondary" className={`${tierInfo.color} flex items-center gap-1 self-start`}>
                          <TierIcon className="h-2 w-2 sm:h-3 sm:w-3" />
                          <span className="text-xs">{customer.loyalty_tier}</span>
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </span>
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            {customer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                                      <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center border-t sm:border-t-0 pt-3 sm:pt-0 flex-shrink-0">
                     <div>
                       <p className="text-xs sm:text-sm text-muted-foreground">Total Spent</p>
                       <p className="font-semibold text-sm sm:text-base flex items-center justify-center gap-1">
                         <SaudiRiyalIcon className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                         <span className="truncate">{customer.total_spent.toLocaleString()}</span>
                       </p>
                     </div>
                     <div>
                       <p className="text-xs sm:text-sm text-muted-foreground">Orders</p>
                       <p className="font-semibold text-sm sm:text-base">{customer.orders_count}</p>
                     </div>
                     <div>
                       <p className="text-xs sm:text-sm text-muted-foreground">Avg Order</p>
                       <p className="font-semibold text-sm sm:text-base flex items-center justify-center gap-1">
                         <SaudiRiyalIcon className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                         <span className="truncate">{customer.avg_order_value}</span>
                       </p>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoyalCustomersPage; 