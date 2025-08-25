import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export interface TeamMember {
  id: string;
  name: string;
  position?: string;
  role?: string;
  isManager?: boolean;
  status: 'active' | 'inactive' | 'open';
  email?: string;
  phone?: string;
}

export interface Department {
  id: string;
  name: string;
  members: TeamMember[];
}
import { 
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
  Crown,
  Star,
  Award,
  ArrowUpRight,
  UserCheck,
  Clock,
  Calendar
} from 'lucide-react';

interface TeamTreeProps {
  department: Department;
  className?: string;
}

const TeamTree: React.FC<TeamTreeProps> = ({ department, className = '' }) => {
  const getDepartmentIcon = (departmentName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      'Content & Creative Department': Paintbrush,
      'Customer Service Department': Users,
      'Customer Retention Department': HeadphonesIcon,
      'Media Buyer Department': Target,
      'Digital Solutions Department': TrendingUp,
      'Warehouse Department': ShoppingCart,
      'Design Department': Palette,
      'Content Creator Department': PenTool,
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
      'Content Creator': PenTool,
      'Marketing': Megaphone,
      'Photography': Camera,
      'Video Production': Video,
      'Content Creation': FileText,
      'Web Development': Globe,
      'Technical Support': Wrench,
      'IT': Laptop,
      'Sales': Zap,
      'Junior CRM Specialist': HeadphonesIcon,
      'default': Users
    };
    
    return iconMap[departmentName] || iconMap.default;
  };

  const getDepartmentColors = (departmentName: string) => {
    const colorMap: { [key: string]: { light: string; dark: string; bg: string; border: string; text: string; darkText: string } } = {
      'Content & Creative Department': {
        light: 'from-blue-50 to-blue-100',
        dark: 'from-blue-900/20 to-blue-800/20',
        bg: 'bg-blue-500',
        border: 'border-blue-200 dark:border-blue-700',
        text: 'text-blue-900',
        darkText: 'dark:text-blue-100'
      },
      'Customer Service Department': {
        light: 'from-green-50 to-green-100',
        dark: 'from-green-900/20 to-green-800/20',
        bg: 'bg-green-500',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-900',
        darkText: 'dark:text-green-100'
      },
      'Customer Retention Department': {
        light: 'from-green-50 to-green-100',
        dark: 'from-green-900/20 to-green-800/20',
        bg: 'bg-green-500',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-900',
        darkText: 'dark:text-green-100'
      },
      'Media Buyer Department': {
        light: 'from-orange-50 to-orange-100',
        dark: 'from-orange-900/20 to-orange-800/20',
        bg: 'bg-orange-500',
        border: 'border-orange-200 dark:border-orange-700',
        text: 'text-orange-900',
        darkText: 'dark:text-orange-100'
      },
      'Digital Solutions Department': {
        light: 'from-cyan-50 to-cyan-100',
        dark: 'from-cyan-900/20 to-cyan-800/20',
        bg: 'bg-cyan-500',
        border: 'border-cyan-200 dark:border-cyan-700',
        text: 'text-cyan-900',
        darkText: 'dark:text-cyan-100'
      },
      'Warehouse Department': {
        light: 'from-teal-50 to-teal-100',
        dark: 'from-teal-900/20 to-teal-800/20',
        bg: 'bg-teal-500',
        border: 'border-teal-200 dark:border-teal-700',
        text: 'text-teal-900',
        darkText: 'dark:text-teal-100'
      },
      'Design Department': {
        light: 'from-pink-50 to-pink-100',
        dark: 'from-pink-900/20 to-pink-800/20',
        bg: 'bg-pink-500',
        border: 'border-pink-200 dark:border-pink-700',
        text: 'text-pink-900',
        darkText: 'dark:text-pink-100'
      },
      'Content Creator Department': {
        light: 'from-indigo-50 to-indigo-100',
        dark: 'from-indigo-900/20 to-indigo-800/20',
        bg: 'bg-indigo-500',
        border: 'border-indigo-200 dark:border-indigo-700',
        text: 'text-indigo-900',
        darkText: 'dark:text-indigo-100'
      },
      'IT Department': {
        light: 'from-red-50 to-red-100',
        dark: 'from-red-900/20 to-red-800/20',
        bg: 'bg-red-500',
        border: 'border-red-200 dark:border-red-700',
        text: 'text-red-900',
        darkText: 'dark:text-red-100'
      },
      'Marketing Department': {
        light: 'from-red-50 to-red-100',
        dark: 'from-red-900/20 to-red-800/20',
        bg: 'bg-red-500',
        border: 'border-red-200 dark:border-red-700',
        text: 'text-red-900',
        darkText: 'dark:text-red-100'
      },
      'Sales Department': {
        light: 'from-yellow-50 to-yellow-100',
        dark: 'from-yellow-900/20 to-yellow-800/20',
        bg: 'bg-yellow-500',
        border: 'border-yellow-200 dark:border-yellow-700',
        text: 'text-yellow-900',
        darkText: 'dark:text-yellow-100'
      },
      'Technical Support Department': {
        light: 'from-gray-50 to-gray-100',
        dark: 'from-gray-900/20 to-gray-800/20',
        bg: 'bg-gray-500',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-900',
        darkText: 'dark:text-gray-100'
      },
      'Web Development Department': {
        light: 'from-blue-50 to-blue-100',
        dark: 'from-blue-900/20 to-blue-800/20',
        bg: 'bg-blue-500',
        border: 'border-blue-200 dark:border-blue-700',
        text: 'text-blue-900',
        darkText: 'dark:text-blue-100'
      },
      'Photography Department': {
        light: 'from-purple-50 to-purple-100',
        dark: 'from-purple-900/20 to-purple-800/20',
        bg: 'bg-purple-500',
        border: 'border-purple-200 dark:border-purple-700',
        text: 'text-purple-900',
        darkText: 'dark:text-purple-100'
      },
      'Video Production Department': {
        light: 'from-red-50 to-red-100',
        dark: 'from-red-900/20 to-red-800/20',
        bg: 'bg-red-500',
        border: 'border-red-200 dark:border-red-700',
        text: 'text-red-900',
        darkText: 'dark:text-red-100'
      },
      'Content Creation Department': {
        light: 'from-green-50 to-green-100',
        dark: 'from-green-900/20 to-green-800/20',
        bg: 'bg-green-500',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-900',
        darkText: 'dark:text-green-100'
      },
      'General Department': {
        light: 'from-purple-50 to-purple-100',
        dark: 'from-purple-900/20 to-purple-800/20',
        bg: 'bg-purple-500',
        border: 'border-purple-200 dark:border-purple-700',
        text: 'text-purple-900',
        darkText: 'dark:text-purple-100'
      },
      'Executive Director General': {
        light: 'from-purple-50 to-purple-100',
        dark: 'from-purple-900/20 to-purple-800/20',
        bg: 'bg-purple-500',
        border: 'border-purple-200 dark:border-purple-700',
        text: 'text-purple-900',
        darkText: 'dark:text-purple-100'
      }
    };
    
    return colorMap[departmentName] || colorMap['Content & Creative Department'];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700">Inactive</Badge>;
      case 'open':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">Open Position</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700">{status}</Badge>;
    }
  };

  const managers = department.members.filter(m => m.isManager);
  const teamMembers = department.members.filter(m => !m.isManager);

  const DepartmentIcon = getDepartmentIcon(department.name);
  const colors = getDepartmentColors(department.name);

  return (
    <div className={`w-full max-w-6xl mx-auto ${className}`}>
      {/* Enhanced Department Header */}
      <Card className={`mb-8 border-2 ${colors.border} bg-gradient-to-br ${colors.light} dark:${colors.dark} overflow-hidden relative`}>
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <div className={`p-4 ${colors.bg} rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300`}>
              <DepartmentIcon className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className={`text-3xl font-bold ${colors.text} ${colors.darkText} mb-2`}>
                {department.name}
              </h2>
              <p className={`${colors.text} ${colors.darkText} opacity-80 text-lg`}>
                VNQ Team Structure
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className={`text-sm ${colors.text} ${colors.darkText} opacity-70`}>
                    {department.members.length} Total Members
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className={`text-sm ${colors.text} ${colors.darkText} opacity-70`}>
                    {managers.length} Managers
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
        </CardContent>
      </Card>

      {/* Enhanced Team Structure */}
      <div className="space-y-8">
        {/* Managers Section */}
        {managers.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                Leadership Team
              </h3>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6">
              {managers.map((manager, index) => (
                <Card
                  key={manager.id}
                  className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 border-yellow-200 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 overflow-hidden relative w-80"
                >
                  <CardContent className="p-6">
                    {/* Manager Badge */}
                    <div className="absolute top-4 right-4">
                      <div className="p-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    </div>

                    {/* Manager Info */}
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="text-white font-bold text-lg">
                          {manager.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
                        {manager.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {manager.position || 'Manager'}
                      </p>
                    </div>

                    {/* Manager Details */}
                    <div className="space-y-2">
                      {manager.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Phone:</span>
                          <span>{manager.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-yellow-200/30 to-transparent rounded-full -translate-y-6 translate-x-6"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Connecting Line */}
        {managers.length > 0 && teamMembers.length > 0 && (
          <div className="flex justify-center my-8">
            <div className="w-px h-16 bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600"></div>
          </div>
        )}

        {/* Team Members Section */}
        {teamMembers.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                Team Members
              </h3>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              {teamMembers.map((member, index) => (
                <Card
                  key={member.id}
                  className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden relative w-64"
                >
                  <CardContent className="p-4">
                    {/* Member Avatar */}
                    <div className="text-center mb-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="text-white font-bold text-sm">
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        {member.name}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {member.position || 'Team Member'}
                      </p>
                    </div>

                    {/* Member Details */}
                    <div className="space-y-1">
                      {member.phone && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {member.phone}
                        </div>
                      )}
                    </div>

                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

export default TeamTree;
