import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllDepartments, getDepartmentById } from '../lib/teamApi';
import { Department } from '../types/team';
import TeamTree from '../components/TeamTree';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { 
  Search, 
  Filter, 
  Users, 
  Building2, 
  Target, 
  TrendingUp, 
  ShoppingCart, 
  Palette, 
  PenTool, 
  Megaphone, 
  Camera, 
  Video, 
  FileText, 
  Globe, 
  Wrench, 
  Laptop, 
  Zap, 
  Paintbrush, 
  HeadphonesIcon,
  ArrowRight,
  Sparkles,
  Star
} from 'lucide-react';

const OurTeamPage: React.FC = () => {
  const { user } = useAuth();
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const departments = await getAllDepartments();
        setAllDepartments(departments);
      } catch (error) {
        console.error('Error fetching team data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamData();
  }, []);

  const getDepartmentIcon = (departmentName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      'Content & Creative Department': Paintbrush,
      'Customer Service Department': Users,
      'Customer Retention Department': HeadphonesIcon,
      'Media Buyer Department': Target,
      'Digital Solutions Department': TrendingUp,
      'Warehouse Department': ShoppingCart,
      'Design Department': Palette,
      'Copy Writing Department': PenTool,
      'Marketing Department': Megaphone,
      'Photography Department': Camera,
      'Video Production Department': Video,
      'Content Creation Department': FileText,
      'General Department': Building2,
      'Executive Director General': Building2,
      'Web Development Department': Globe,
      'Technical Support Department': Wrench,
      'IT Department': Laptop,
      'Sales Department': Zap,
      'Content & Creative': Paintbrush,
      'Customer Service': HeadphonesIcon,
      'Customer Retention': HeadphonesIcon,
      'Media Buyer': Target,
      'Digital Solutions': TrendingUp,
      'Warehouse': ShoppingCart,
      'Design': Palette,
      'Copy Writing': PenTool,
      'Marketing': Megaphone,
      'Photography': Camera,
      'Video Production': Video,
      'Content Creation': FileText,
      'Web Development': Globe,
      'Technical Support': Wrench,
      'IT': Laptop,
      'Sales': Zap,
      'default': Building2
    };
    
    return iconMap[departmentName] || iconMap.default;
  };

  const getDepartmentColors = (departmentName: string) => {
    const colorMap: { [key: string]: { light: string; dark: string; bg: string; border: string; text: string; darkText: string; iconBg: string; iconColor: string } } = {
      'Content & Creative Department': {
        light: 'from-blue-50 to-blue-100',
        dark: 'from-blue-900/20 to-blue-800/20',
        bg: 'bg-blue-500',
        border: 'border-blue-200 dark:border-blue-700',
        text: 'text-blue-900',
        darkText: 'dark:text-blue-100',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400'
      },
      'Customer Service Department': {
        light: 'from-green-50 to-green-100',
        dark: 'from-green-900/20 to-green-800/20',
        bg: 'bg-green-500',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-900',
        darkText: 'dark:text-green-100',
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400'
      },
      'Customer Retention Department': {
        light: 'from-green-50 to-green-100',
        dark: 'from-green-900/20 to-green-800/20',
        bg: 'bg-green-500',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-900',
        darkText: 'dark:text-green-100',
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400'
      },
      'Media Buyer Department': {
        light: 'from-orange-50 to-orange-100',
        dark: 'from-orange-900/20 to-orange-800/20',
        bg: 'bg-orange-500',
        border: 'border-orange-200 dark:border-orange-700',
        text: 'text-orange-900',
        darkText: 'dark:text-orange-100',
        iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        iconColor: 'text-orange-600 dark:text-orange-400'
      },
      'Digital Solutions Department': {
        light: 'from-cyan-50 to-cyan-100',
        dark: 'from-cyan-900/20 to-cyan-800/20',
        bg: 'bg-cyan-500',
        border: 'border-cyan-200 dark:border-cyan-700',
        text: 'text-cyan-900',
        darkText: 'dark:text-cyan-100',
        iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
        iconColor: 'text-cyan-600 dark:text-cyan-400'
      },
      'Warehouse Department': {
        light: 'from-teal-50 to-teal-100',
        dark: 'from-teal-900/20 to-teal-800/20',
        bg: 'bg-teal-500',
        border: 'border-teal-200 dark:border-teal-700',
        text: 'text-teal-900',
        darkText: 'dark:text-teal-100',
        iconBg: 'bg-teal-100 dark:bg-teal-900/30',
        iconColor: 'text-teal-600 dark:text-teal-400'
      },
      'Design Department': {
        light: 'from-pink-50 to-pink-100',
        dark: 'from-pink-900/20 to-pink-800/20',
        bg: 'bg-pink-500',
        border: 'border-pink-200 dark:border-pink-700',
        text: 'text-pink-900',
        darkText: 'dark:text-pink-100',
        iconBg: 'bg-pink-100 dark:bg-pink-900/30',
        iconColor: 'text-pink-600 dark:text-pink-400'
      },
      'Copy Writing Department': {
        light: 'from-indigo-50 to-indigo-100',
        dark: 'from-indigo-900/20 to-indigo-800/20',
        bg: 'bg-indigo-500',
        border: 'border-indigo-200 dark:border-indigo-700',
        text: 'text-indigo-900',
        darkText: 'dark:text-indigo-100',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
        iconColor: 'text-indigo-600 dark:text-indigo-400'
      },
      'IT Department': {
        light: 'from-red-50 to-red-100',
        dark: 'from-red-900/20 to-red-800/20',
        bg: 'bg-red-500',
        border: 'border-red-200 dark:border-red-700',
        text: 'text-red-900',
        darkText: 'dark:text-red-100',
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-600 dark:text-red-400'
      },
      'Marketing Department': {
        light: 'from-red-50 to-red-100',
        dark: 'from-red-900/20 to-red-800/20',
        bg: 'bg-red-500',
        border: 'border-red-200 dark:border-red-700',
        text: 'text-red-900',
        darkText: 'dark:text-red-100',
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-600 dark:text-red-400'
      },
      'Sales Department': {
        light: 'from-yellow-50 to-yellow-100',
        dark: 'from-yellow-900/20 to-yellow-800/20',
        bg: 'bg-yellow-500',
        border: 'border-yellow-200 dark:border-yellow-700',
        text: 'text-yellow-900',
        darkText: 'dark:text-yellow-100',
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
        iconColor: 'text-yellow-600 dark:text-yellow-400'
      },
      'Technical Support Department': {
        light: 'from-gray-50 to-gray-100',
        dark: 'from-gray-900/20 to-gray-800/20',
        bg: 'bg-gray-500',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-900',
        darkText: 'dark:text-gray-100',
        iconBg: 'bg-gray-100 dark:bg-gray-900/30',
        iconColor: 'text-gray-600 dark:text-gray-400'
      },
      'Web Development Department': {
        light: 'from-blue-50 to-blue-100',
        dark: 'from-blue-900/20 to-blue-800/20',
        bg: 'bg-blue-500',
        border: 'border-blue-200 dark:border-blue-700',
        text: 'text-blue-900',
        darkText: 'dark:text-blue-100',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400'
      },
      'Photography Department': {
        light: 'from-purple-50 to-purple-100',
        dark: 'from-purple-900/20 to-purple-800/20',
        bg: 'bg-purple-500',
        border: 'border-purple-200 dark:border-purple-700',
        text: 'text-purple-900',
        darkText: 'dark:text-purple-100',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400'
      },
      'Video Production Department': {
        light: 'from-red-50 to-red-100',
        dark: 'from-red-900/20 to-red-800/20',
        bg: 'bg-red-500',
        border: 'border-red-200 dark:border-red-700',
        text: 'text-red-900',
        darkText: 'dark:text-red-100',
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-600 dark:text-red-400'
      },
      'Content Creation Department': {
        light: 'from-green-50 to-green-100',
        dark: 'from-green-900/20 to-green-800/20',
        bg: 'bg-green-500',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-900',
        darkText: 'dark:text-green-100',
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400'
      },
      'General Department': {
        light: 'from-purple-50 to-purple-100',
        dark: 'from-purple-900/20 to-purple-800/20',
        bg: 'bg-purple-500',
        border: 'border-purple-200 dark:border-purple-700',
        text: 'text-purple-900',
        darkText: 'dark:text-purple-100',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400'
      },
      'Executive Director General': {
        light: 'from-purple-50 to-purple-100',
        dark: 'from-purple-900/20 to-purple-800/20',
        bg: 'bg-purple-500',
        border: 'border-purple-200 dark:border-purple-700',
        text: 'text-purple-900',
        darkText: 'dark:text-purple-100',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400'
      }
    };
    
    return colorMap[departmentName] || colorMap['Content & Creative Department'];
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading VNQ Team...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredDepartments = allDepartments.filter(dept => {
    // Exclude General Department
    if (dept.name === 'General Department' || dept.name === 'General') {
      return false;
    }
    
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.members.some(member => member.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || 
      dept.members.some(member => member.status === filterStatus);
    return matchesSearch && matchesStatus;
  });

  if (selectedDepartment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              onClick={() => setSelectedDepartment(null)}
              variant="outline"
              className="mb-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              ← Back to Departments
            </Button>
          </div>
          <TeamTree department={selectedDepartment} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              VNQ Team
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover our talented team across all departments. Each member brings unique expertise and dedication to our mission.
          </p>
        </div>

        {/* Enhanced Search and Filter Section */}
        <div className="mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search departments or team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-12 pl-10 pr-4 border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md transition-colors"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="open">Open Position</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced Department Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
          {filteredDepartments.map((department, index) => {
            const colors = getDepartmentColors(department.name);
            const DepartmentIcon = getDepartmentIcon(department.name);
            const totalMembers = department.members.length;
            const managers = department.members.filter(m => m.isManager);
            const teamMembers = department.members.filter(m => !m.isManager);

            return (
              <Card
                key={department.id}
                className={`group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 ${colors.border} bg-gradient-to-br ${colors.light} dark:${colors.dark} overflow-hidden`}
                onClick={() => setSelectedDepartment(department)}
              >
                <CardContent className="p-6 relative">
                  {/* Enhanced Icon */}
                  <div className={`inline-flex p-3 ${colors.iconBg} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <DepartmentIcon className={`w-6 h-6 ${colors.iconColor}`} />
                  </div>

                  {/* Department Name */}
                  <h3 className={`text-xl font-bold ${colors.text} ${colors.darkText} mb-2 group-hover:scale-105 transition-transform duration-300`}>
                    {department.name}
                  </h3>

                  {/* Enhanced Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg backdrop-blur-sm">
                      <p className={`text-2xl font-bold ${colors.text} ${colors.darkText}`}>
                        {totalMembers}
                      </p>
                      <p className={`text-sm ${colors.text} ${colors.darkText} opacity-80`}>
                        Total Members
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg backdrop-blur-sm">
                      <p className={`text-2xl font-bold ${colors.text} ${colors.darkText}`}>
                        {managers.length}
                      </p>
                      <p className={`text-sm ${colors.text} ${colors.darkText} opacity-80`}>
                        Managers
                      </p>
                    </div>
                  </div>

                  {/* Team Preview */}
                  <div className="space-y-2 mb-4">
                    {managers.slice(0, 2).map((manager) => (
                      <div key={manager.id} className="flex items-center justify-center gap-2 p-2 bg-white/30 dark:bg-black/20 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className={`text-sm font-medium ${colors.text} ${colors.darkText}`}>
                          {manager.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">Manager</Badge>
                      </div>
                    ))}
                    {teamMembers.slice(0, 2).map((member) => (
                      <div key={member.id} className="flex items-center justify-center gap-2 p-2 bg-white/30 dark:bg-black/20 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className={`text-sm ${colors.text} ${colors.darkText}`}>
                          {member.name}
                        </span>
                      </div>
                    ))}
                    {totalMembers > 4 && (
                      <div className="text-center p-2">
                        <span className={`text-sm ${colors.text} ${colors.darkText} opacity-70`}>
                          +{totalMembers - 4} more members
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Enhanced CTA */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`${colors.text} ${colors.darkText} hover:bg-white/20 dark:hover:bg-black/20 transition-colors`}
                    >
                      View Details
                    </Button>
                    <ArrowRight className={`w-4 h-4 ${colors.iconColor} group-hover:translate-x-1 transition-transform duration-300`} />
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-8 -translate-x-8"></div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Enhanced Empty State */}
        {filteredDepartments.length === 0 && (
          <div className="text-center py-16">
            <div className="p-6 bg-white/50 dark:bg-black/20 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No departments found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OurTeamPage;
