import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Clock, 
  User, 
  Calendar,
  ExternalLink,
  Brush,
  Layers,
  Image,
  Zap,
  Filter,
  Grid3X3,
  List,
  Plus,
  Eye,
  MessageCircle,
  Star,
  TrendingUp,
  Download,
  Upload,
  Search
} from 'lucide-react';
import { toast } from "sonner";
import { fetchUserTasks, updateTaskProgress } from '@/lib/tasksApi';
import { getTaskAverageRating } from '@/lib/ratingsApi';
import { getFileUrl, isImageFile } from '@/lib/fileUpload';
import TaskComments from '@/components/TaskComments';
import StarRating from '@/components/StarRating';

// Enhanced Task interface for designer
interface DesignTask {
  id: string;
  title: string;
  description: string;
  status: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete' | 'Unfinished';
  assignedTo: string;
  assignedToName?: string;
  assignedToPosition?: string;
  createdBy: string;
  createdByName?: string;
  createdByPosition?: string;
  createdAt: Date;
  updatedAt: Date;
  progressPercentage: number;
  comments?: any[];
  averageRating?: number;
  // Design-specific fields extracted from description or comments
  projectType?: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  driveLink?: string;
  clientName?: string;
  deadline?: Date;
  designStyle?: string;
  // New designer-specific fields from admin
  tacticalPlan?: string;
  timeEstimate?: string;
  aim?: string;
  idea?: string;
  copy?: string;
  visualFeeding?: string;
  attachmentFile?: string;
  notes?: string;
}

const DesignerDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<DesignTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DesignTask | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Load tasks when component mounts
  useEffect(() => {
    if (user && user.position === 'Designer') {
      loadTasks();
    }
  }, [user]);

  // Filter tasks when filters change
  useEffect(() => {
    filterTasks();
  }, [tasks, filterStatus, filterProject, filterPriority, searchQuery]);

  const loadTasks = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userTasks = await fetchUserTasks(user.id);
      
      // Enhance tasks with design-specific metadata
      const enhancedTasks = await Promise.all(
        userTasks.map(async (task: any) => {
          try {
            const averageRating = await getTaskAverageRating(task.id);
            
            // Parse design-specific info from description or title
            const designTask: DesignTask = {
              ...task,
              averageRating: averageRating > 0 ? averageRating : undefined,
              // Use database projectType if available, otherwise extract from description
              projectType: task.projectType || extractProjectType(task.title, task.description),
              // Use database priority if available, otherwise extract from description
              priority: task.priority || extractPriority(task.description),
              driveLink: extractDriveLink(task.description),
              clientName: extractClientName(task.title, task.description),
              deadline: extractDeadline(task.description),
              designStyle: extractDesignStyle(task.description)
            };
            
            return designTask;
          } catch (error) {
            console.error(`Error enhancing task ${task.id}:`, error);
            return task;
          }
        })
      );
      
      setTasks(enhancedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load design tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Project type filter
    if (filterProject !== 'all') {
      filtered = filtered.filter(task => task.projectType === filterProject);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.clientName?.toLowerCase().includes(query) ||
        task.createdByName?.toLowerCase().includes(query)
      );
    }

    setFilteredTasks(filtered);
  };

  // Helper functions to extract design metadata
  const extractProjectType = (title: string, description: string): DesignTask['projectType'] => {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('social media') || text.includes('instagram') || text.includes('facebook') || text.includes('post')) return 'social-media';
    if (text.includes('website') || text.includes('web') || text.includes('landing')) return 'web-design';
    if (text.includes('logo') || text.includes('brand') || text.includes('identity')) return 'branding';
    if (text.includes('print') || text.includes('brochure') || text.includes('flyer')) return 'print';
    if (text.includes('ui') || text.includes('ux') || text.includes('interface') || text.includes('app')) return 'ui-ux';
    return 'other';
  };

  const extractPriority = (description: string): DesignTask['priority'] => {
    const text = description.toLowerCase();
    if (text.includes('urgent') || text.includes('asap') || text.includes('emergency')) return 'urgent';
    if (text.includes('high priority') || text.includes('important')) return 'high';
    if (text.includes('low priority') || text.includes('when possible')) return 'low';
    return 'medium';
  };

  const extractDriveLink = (description: string): string | undefined => {
    const driveRegex = /https:\/\/drive\.google\.com\/[^\s]+/g;
    const match = description.match(driveRegex);
    return match ? match[0] : undefined;
  };

  const extractClientName = (title: string, description: string): string | undefined => {
    // Look for "for [client]" or "client: [name]" patterns
    const text = `${title} ${description}`;
    const clientMatch = text.match(/(?:for |client:?\s*)([A-Za-z\s]+?)(?:\s|$|,|\.|;)/i);
    return clientMatch ? clientMatch[1].trim() : undefined;
  };

  const extractDeadline = (description: string): Date | undefined => {
    // Look for date patterns
    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
    const match = description.match(dateRegex);
    if (match) {
      try {
        return new Date(`${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`);
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const extractDesignStyle = (description: string): string | undefined => {
    const text = description.toLowerCase();
    if (text.includes('minimalist') || text.includes('clean')) return 'Minimalist';
    if (text.includes('modern') || text.includes('contemporary')) return 'Modern';
    if (text.includes('vintage') || text.includes('retro')) return 'Vintage';
    if (text.includes('bold') || text.includes('vibrant')) return 'Bold';
    if (text.includes('elegant') || text.includes('luxury')) return 'Elegant';
    return undefined;
  };

  const getProjectTypeIcon = (type: DesignTask['projectType']) => {
    switch (type) {
      case 'social-media': return <Image className="w-4 h-4" />;
      case 'web-design': return <Layers className="w-4 h-4" />;
      case 'branding': return <Palette className="w-4 h-4" />;
      case 'print': return <Download className="w-4 h-4" />;
      case 'ui-ux': return <Zap className="w-4 h-4" />;
      default: return <Brush className="w-4 h-4" />;
    }
  };

  const getProjectTypeColor = (type: DesignTask['projectType']) => {
    switch (type) {
      case 'social-media': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'web-design': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'branding': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'print': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ui-ux': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: DesignTask['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'On Hold':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Unfinished':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleImageClick = (imagePath: string) => {
    setSelectedImage(imagePath);
    setIsImageModalOpen(true);
  };

  const handleUpdateProgress = async (taskId: string, newProgress: number) => {
    try {
      await updateTaskProgress(taskId, newProgress, user!.id);
      
      // Update local state
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            progressPercentage: newProgress,
            status: newProgress === 0 ? 'Not Started' as const : 
                   newProgress === 100 ? 'Complete' as const : 
                   'In Progress' as const
          };
        }
        return task;
      });
      setTasks(updatedTasks);

      toast.success("Project progress updated successfully");
      
      // Close the dialog after successful update
      setIsDialogOpen(false);
      setSelectedTask(null);
      
      // Refresh data to ensure consistency
      loadTasks();
    } catch (error) {
      console.error("Error updating task progress:", error);
      toast.error("Failed to update project progress");
    }
  };

  // Calculate dashboard stats
  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    completed: tasks.filter(t => t.status === 'Complete').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Please log in to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Digital Solution Manager has access to everything
  if (user.position === 'Digital Solution Manager') {
    // Continue to render the page
  } else if (user.position !== 'Designer') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              This page is only accessible to Designers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Palette className="w-12 h-12 animate-pulse text-purple-500 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading your design projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/98">
        <div className="px-4 md:px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-3">
                <Palette className="w-8 h-8 text-purple-500" />
                Design Studio
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Manage your creative projects and design tasks
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
                <div className="text-xs text-muted-foreground">Urgent</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Filters and Controls */}
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-border/30">
        <div className="space-y-3">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search projects, clients, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {/* Mobile-Responsive Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* First row of filters */}
            <div className="flex gap-2 flex-1">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="flex-1 min-w-0 h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Unfinished">Unfinished</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="flex-1 min-w-0 h-10">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="social-media">📱 Social Media</SelectItem>
                  <SelectItem value="web-design">🌐 Web Design</SelectItem>
                  <SelectItem value="branding">🎨 Branding</SelectItem>
                  <SelectItem value="print">📄 Print</SelectItem>
                  <SelectItem value="ui-ux">⚡ UI/UX</SelectItem>
                  <SelectItem value="other">📂 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Second row - Priority and View Toggle */}
            <div className="flex gap-2">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="flex-1 min-w-[120px] h-10">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex border border-border rounded-lg p-1 h-10">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="px-2 sm:px-3 h-8"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-2 sm:px-3 h-8"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-6 py-6">
        {filteredTasks.length === 0 ? (
          <Card className="p-12 text-center">
            <Brush className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Design Projects Found</h3>
            <p className="text-muted-foreground">
              {tasks.length === 0 
                ? "You don't have any design projects assigned yet."
                : "Try adjusting your filters to see more projects."
              }
            </p>
          </Card>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
              : "space-y-3 sm:space-y-4"
          }>
            {filteredTasks.map((task) => (
              <Card 
                key={task.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-2 hover:border-purple-200 ${
                  task.priority === 'urgent' ? 'ring-2 ring-red-200 ring-opacity-50' : ''
                } ${viewMode === 'list' ? 'flex flex-row' : ''}`}
                onClick={() => {
                  setSelectedTask(task);
                  setIsDialogOpen(true);
                }}
              >
                {viewMode === 'grid' ? (
                  <>
                    <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 lg:p-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                          {getProjectTypeIcon(task.projectType)}
                          <Badge variant="outline" className={`text-xs ${getProjectTypeColor(task.projectType)} truncate`}>
                            {task.projectType?.replace('-', ' ').toUpperCase() || 'OTHER'}
                          </Badge>
                        </div>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)} flex-shrink-0`}>
                          {task.priority?.toUpperCase()}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold line-clamp-2 break-words overflow-wrap-anywhere mb-1">
                        {task.title}
                      </CardTitle>
                      
                      {/* Move description to header to remove gap */}
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3 break-words overflow-wrap-anywhere mb-2">
                        {task.description}
                      </p>
                      
                      {task.clientName && (
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{task.clientName}</span>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6 pt-0">
                      
                      {/* Visual Feeding Preview - Show on card if available */}
                      {task.visualFeeding && isImageFile(task.visualFeeding) && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-pink-600">🖼️</span>
                            <span className="text-xs font-medium text-pink-600">Visual Reference</span>
                          </div>
                          <div className="relative group cursor-pointer" onClick={(e) => {
                            e.stopPropagation(); // Prevent opening task dialog
                            handleImageClick(task.visualFeeding);
                          }}>
                            <img 
                              src={task.visualFeeding} 
                              alt="Visual Reference Preview" 
                              className="w-full h-20 sm:h-24 object-cover rounded border-2 border-pink-200 transition-all duration-200 group-hover:border-pink-400 group-hover:shadow-lg"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            {/* Overlay to indicate it's clickable */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="bg-white bg-opacity-90 rounded-full p-1.5">
                                  <Eye className="w-3 h-3 text-gray-700" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Designer Brief Summary */}
                      {(task.tacticalPlan || task.timeEstimate || task.aim) && (
                        <div className="mt-3 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">📋 Creative Brief</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            {task.timeEstimate && (
                              <div className="flex items-center gap-1">
                                <span className="text-orange-600">⏱️</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">Time: {task.timeEstimate}</span>
                              </div>
                            )}
                            {task.aim && (
                              <div className="flex items-start gap-1">
                                <span className="text-green-600 mt-0.5">🎯</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{task.aim}</span>
                              </div>
                            )}
                            {task.tacticalPlan && (
                              <div className="flex items-start gap-1">
                                <span className="text-blue-600 mt-0.5">📋</span>
                                <span className="text-slate-600 dark:text-slate-400 line-clamp-1">{task.tacticalPlan}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Progress</span>
                          <span className="text-xs font-medium">{task.progressPercentage}%</span>
                        </div>
                        <Progress value={task.progressPercentage} className="h-1.5 sm:h-2" />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)} flex-shrink-0`}>
                          {task.status}
                        </Badge>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {task.driveLink && (
                            <ExternalLink className="w-3 sm:w-4 h-3 sm:h-4 text-blue-500" />
                          )}
                          {task.comments && task.comments.length > 0 && (
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{task.comments.length}</span>
                            </div>
                          )}
                          {task.averageRating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span className="text-xs text-muted-foreground">{task.averageRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Updated {new Date(task.updatedAt).toLocaleDateString()}</span>
                          </div>
                          {task.createdByName && (
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              👤 From: {task.createdByName}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {/* File indicators */}
                          <div className="flex items-center gap-1">
                            {task.visualFeeding && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                                🖼️
                              </span>
                            )}
                            {task.attachmentFile && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                📎
                              </span>
                            )}
                            {task.comments && task.comments.length > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                💬 {task.comments.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <div className="flex-1 flex items-center gap-4 p-4">
                    {/* Visual Preview in List Mode */}
                    {task.visualFeeding && isImageFile(task.visualFeeding) && (
                      <div className="flex-shrink-0">
                        <img 
                          src={task.visualFeeding} 
                          alt="Visual Reference" 
                          className="w-12 h-12 object-cover rounded border-2 border-pink-200 cursor-pointer hover:border-pink-400 transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageClick(task.visualFeeding);
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {getProjectTypeIcon(task.projectType)}
                      <Badge variant="outline" className={`text-xs ${getProjectTypeColor(task.projectType)}`}>
                        {task.projectType?.replace('-', ' ').toUpperCase() || 'OTHER'}
                      </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{task.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                      {task.createdByName && (
                        <p className="text-xs text-purple-600 dark:text-purple-400">From: {task.createdByName}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {/* File indicators in list mode */}
                      <div className="flex items-center gap-1">
                        {task.attachmentFile && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                            📎
                          </span>
                        )}
                        {task.comments && task.comments.length > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            💬 {task.comments.length}
                          </span>
                        )}
                      </div>
                      
                      <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)}`}>
                        {task.status}
                      </Badge>
                      <div className="w-20">
                        <Progress value={task.progressPercentage} className="h-2" />
                      </div>
                      <span className="text-sm font-medium w-12">{task.progressPercentage}%</span>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[90vw] sm:max-w-[600px] lg:max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          {selectedTask && (
            <>
              <DialogHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <DialogTitle className="text-base sm:text-lg lg:text-xl break-words overflow-wrap-anywhere pr-8">
                      {selectedTask.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      View project details, update progress, and manage comments for this design task.
                    </DialogDescription>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={`text-xs ${getProjectTypeColor(selectedTask.projectType)}`}>
                        <div className="flex items-center gap-1">
                          {getProjectTypeIcon(selectedTask.projectType)}
                          <span className="break-words">{selectedTask.projectType?.replace('-', ' ').toUpperCase() || 'OTHER'}</span>
                        </div>
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getPriorityColor(selectedTask.priority)}`}>
                        {selectedTask.priority?.toUpperCase()} PRIORITY
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(selectedTask.status)}`}>
                        {selectedTask.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-2 mb-6 h-auto">
                  <TabsTrigger 
                    value="details" 
                    className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium h-12 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50 mx-1"
                  >
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Project Details</span>
                    <span className="sm:hidden">Details</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="progress" 
                    className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium h-12 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50 mx-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Update Progress</span>
                    <span className="sm:hidden">Progress</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="comments" 
                    className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium h-12 rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50 mx-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Comments</span>
                    <span className="sm:hidden">Chat</span>
                    {selectedTask.comments && selectedTask.comments.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {selectedTask.comments.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-6">
                  <div className="grid gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Description</Label>
                      <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words overflow-wrap-anywhere">
                          {selectedTask.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6">
                      {selectedTask.clientName && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Client
                          </Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400 pl-6 break-words">{selectedTask.clientName}</p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Assigned By
                        </Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400 pl-6 break-words">
                          {selectedTask.createdByName} ({selectedTask.createdByPosition})
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Created
                          </Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">
                            {new Date(selectedTask.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Last Updated
                          </Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">
                            {new Date(selectedTask.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {selectedTask.deadline && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-500" />
                            Deadline
                          </Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">
                            {selectedTask.deadline.toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {selectedTask.designStyle && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            Design Style
                          </Label>
                          <p className="text-sm text-slate-600 dark:text-slate-400 pl-6 break-words">{selectedTask.designStyle}</p>
                        </div>
                      )}
                    </div>

                    {selectedTask.driveLink && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Design Files
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full min-h-[48px] text-sm bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-blue-200 text-blue-700 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-700 dark:text-blue-300 transition-all duration-200"
                          onClick={() => window.open(selectedTask.driveLink, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Design Files
                        </Button>
                      </div>
                    )}

                    {selectedTask.averageRating && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          Average Rating
                        </Label>
                        <div className="flex items-center gap-3 pl-6">
                          <StarRating rating={selectedTask.averageRating} readonly size="sm" />
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            ({selectedTask.averageRating.toFixed(1)})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Designer Brief Section - Show if any designer fields exist */}
                    {(selectedTask.tacticalPlan || selectedTask.timeEstimate || selectedTask.aim || 
                      selectedTask.idea || selectedTask.copy || selectedTask.visualFeeding || 
                      selectedTask.attachmentFile || selectedTask.notes) && (
                      <div className="border-t pt-6 mt-6">
                        <div className="mb-4 flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">🎨</span>
                          </div>
                          <Label className="text-base font-bold text-slate-900 dark:text-slate-100">Creative Brief</Label>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            Designer Details
                          </span>
                        </div>
                        
                        <div className="grid gap-4">
                          {selectedTask.tacticalPlan && (
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span className="text-purple-600">📋</span> Tactical Plan
                              </Label>
                              <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-700">
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                  {selectedTask.tacticalPlan}
                                </p>
                              </div>
                            </div>
                          )}

                          {(selectedTask.timeEstimate || selectedTask.aim) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {selectedTask.timeEstimate && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span className="text-blue-600">⏱️</span> Time Estimate
                                  </Label>
                                  <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedTask.timeEstimate}</p>
                                  </div>
                                </div>
                              )}

                              {selectedTask.aim && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span className="text-green-600">🎯</span> Aim/Goal
                                  </Label>
                                  <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-700">
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedTask.aim}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedTask.idea && (
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span className="text-yellow-600">💡</span> Creative Idea
                              </Label>
                              <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl border border-yellow-200 dark:border-yellow-700">
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                  {selectedTask.idea}
                                </p>
                              </div>
                            </div>
                          )}

                          {selectedTask.copy && (
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span className="text-indigo-600">📝</span> Copy Text
                              </Label>
                              <div className="p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl border border-indigo-200 dark:border-indigo-700">
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                  {selectedTask.copy}
                                </p>
                              </div>
                            </div>
                          )}

                          {(selectedTask.visualFeeding || selectedTask.attachmentFile) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {selectedTask.visualFeeding && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span className="text-pink-600">🖼️</span> Visual Feeding
                                  </Label>
                                  <div className="p-3 bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-lg border border-pink-200 dark:border-pink-700">
                                    {/* Image Preview - if it's an image file */}
                                    {selectedTask.visualFeeding && isImageFile(selectedTask.visualFeeding) ? (
                                      <div className="space-y-2">
                                        <div className="relative group cursor-pointer" onClick={() => handleImageClick(selectedTask.visualFeeding)}>
                                          <img 
                                            src={selectedTask.visualFeeding} 
                                            alt="Visual Reference" 
                                            className="w-full h-auto max-h-48 rounded border transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                          {/* Overlay to indicate it's clickable */}
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded border flex items-center justify-center">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                              <div className="bg-white bg-opacity-90 rounded-full p-2">
                                                <Eye className="w-4 h-4 text-gray-700" />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        <p className="text-xs text-slate-500 text-center">Click to view full size</p>
                                      </div>
                                    ) : (
                                      /* Show as link if not an image */
                                      <div className="flex items-center gap-2">
                                        <span className="text-pink-600">📷</span>
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{selectedTask.visualFeeding}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {selectedTask.attachmentFile && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span className="text-orange-600">📎</span> Additional Files
                                  </Label>
                                  <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-700">
                                    <div className="flex items-center gap-2">
                                      <span className="text-orange-600">📄</span>
                                      <span className="text-sm text-slate-700 dark:text-slate-300">{selectedTask.attachmentFile}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedTask.notes && (
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span className="text-gray-600">💬</span> Additional Notes
                              </Label>
                              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-xl border border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                  {selectedTask.notes}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="space-y-6 mt-6">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Current Progress
                      </Label>
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                        <Progress value={selectedTask.progressPercentage} className="flex-1 h-3" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-12">{selectedTask.progressPercentage}%</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick Progress Updates</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {[0, 25, 50, 75, 100].map((progress) => (
                          <Button
                            key={progress}
                            variant={selectedTask.progressPercentage === progress ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleUpdateProgress(selectedTask.id, progress)}
                            className={`w-full min-h-[48px] text-xs sm:text-sm font-medium transition-all duration-200 ${
                              selectedTask.progressPercentage === progress 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105' 
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105'
                            }`}
                          >
                            {progress}%
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Custom Progress</Label>
                      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Enter progress %"
                          className="flex-1 min-h-[48px] text-base border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseInt((e.target as HTMLInputElement).value);
                              if (value >= 0 && value <= 100) {
                                handleUpdateProgress(selectedTask.id, value);
                              }
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          className="min-h-[48px] text-sm sm:text-base bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-green-200 text-green-700 dark:from-green-900/20 dark:to-green-800/20 dark:border-green-700 dark:text-green-300 transition-all duration-200"
                          onClick={() => {
                            const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                            const value = parseInt(input.value);
                            if (value >= 0 && value <= 100) {
                              handleUpdateProgress(selectedTask.id, value);
                            }
                          }}
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="mt-6">
                  <div className="min-h-[300px] p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                    <TaskComments
                      taskId={selectedTask.id}
                      user={user}
                      comments={selectedTask.comments || []}
                      onCommentAdded={(newComments) => {
                        // Update the task comments in the local state
                        setTasks(tasks.map(task => 
                          task.id === selectedTask.id 
                            ? {...task, comments: newComments} 
                            : task
                        ));
                        // Also update the selected task
                        setSelectedTask({...selectedTask, comments: newComments});
                      }}
                      language="en"
                      isLocked={false}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/90 border-none">
                      <DialogHeader className="sr-only">
              <DialogTitle>Visual Reference Image</DialogTitle>
              <DialogDescription>View the full-size visual reference image.</DialogDescription>
            </DialogHeader>
          <div className="relative flex items-center justify-center">
            {selectedImage && (
              <img 
                                  src={selectedImage} 
                alt="Visual Reference - Full Size" 
                className="max-w-full max-h-[90vh] object-contain rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            {/* Close button */}
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesignerDashboard;