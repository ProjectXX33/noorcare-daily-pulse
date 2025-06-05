import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Bug, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle,
  User,
  Calendar,
  Monitor,
  MessageSquare,
  BarChart3,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface BugReport {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  reported_by: string;
  assigned_to: string | null;
  browser_info: string | null;
  page_url: string | null;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  reporter?: {
    name: string;
    email: string;
  };
  assignee?: {
    name: string;
    email: string;
  };
}

const AdminBugReportsPage = () => {
  const { user } = useAuth();
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<BugReport>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadBugReports();
    }
  }, [user]);

  useEffect(() => {
    filterReports();
  }, [bugReports, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const loadBugReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select(`
          *,
          reporter:reported_by(name, email),
          assignee:assigned_to(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBugReports(data || []);
    } catch (error) {
      console.error('Error loading bug reports:', error);
      toast.error('Failed to load bug reports');
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = bugReports;

    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.reporter?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(report => report.priority === priorityFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(report => report.category === categoryFilter);
    }

    setFilteredReports(filtered);
  };

  const updateBugReport = async (reportId: string, updates: Partial<BugReport>) => {
    setIsUpdating(true);
    try {
      const updateData: any = { ...updates, updated_at: new Date().toISOString() };
      
      if (updates.status === 'resolved' && !updates.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bug_reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      setBugReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, ...updateData }
          : report
      ));

      toast.success('Bug report updated successfully');
    } catch (error) {
      console.error('Error updating bug report:', error);
      toast.error('Failed to update bug report');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteBugReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this bug report?')) return;

    try {
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setBugReports(prev => prev.filter(report => report.id !== reportId));
      toast.success('Bug report deleted successfully');
    } catch (error) {
      console.error('Error deleting bug report:', error);
      toast.error('Failed to delete bug report');
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedReport) return;
    
    await updateBugReport(selectedReport.id, editingReport);
    setIsEditModalOpen(false);
    setEditingReport({});
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'in-progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'duplicate': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in-progress': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  // Statistics
  const stats = {
    total: bugReports.length,
    open: bugReports.filter(r => r.status === 'open').length,
    inProgress: bugReports.filter(r => r.status === 'in-progress').length,
    resolved: bugReports.filter(r => r.status === 'resolved').length,
    critical: bugReports.filter(r => r.priority === 'critical').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight flex items-center gap-2">
                <Bug className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                Bug Reports Management
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Review and manage bug reports submitted by employees
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 md:p-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <div className="flex justify-center">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Total Reports</p>
                <div className="text-lg sm:text-xl font-bold text-blue-600">{stats.total}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <div className="flex justify-center">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Open</p>
                <div className="text-lg sm:text-xl font-bold text-orange-600">{stats.open}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <div className="flex justify-center">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">In Progress</p>
                <div className="text-lg sm:text-xl font-bold text-purple-600">{stats.inProgress}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <div className="flex justify-center">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Resolved</p>
                <div className="text-lg sm:text-xl font-bold text-green-600">{stats.resolved}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <div className="flex justify-center">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Critical</p>
                <div className="text-lg sm:text-xl font-bold text-red-600">{stats.critical}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reports..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="duplicate">Duplicate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="ui">User Interface</SelectItem>
                    <SelectItem value="functionality">Functionality</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="data">Data Issues</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bug Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bug Reports ({filteredReports.length})</CardTitle>
            <CardDescription>
              Manage and track all bug reports submitted by employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading bug reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8">
                <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Bug Reports Found</h3>
                <p className="text-muted-foreground">No bug reports match your current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="max-w-[200px]">
                          <div className="font-medium truncate">{report.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {report.description.slice(0, 100)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="text-sm">{report.reporter?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(report.priority)}>
                            {report.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(report.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(report.status)}
                              {report.status.replace('-', ' ')}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{report.category.replace('-', ' ')}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(report.created_at), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report);
                                setEditingReport({
                                  status: report.status,
                                  priority: report.priority,
                                  assigned_to: report.assigned_to,
                                  resolution_notes: report.resolution_notes || ''
                                });
                                setIsEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteBugReport(report.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5 text-red-500" />
                  Bug Report Details
                </DialogTitle>
                <DialogDescription>
                  Full details of the bug report submitted by {selectedReport.reporter?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Title</Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedReport.title}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Reporter</Label>
                    <p className="text-sm bg-muted p-2 rounded">
                      {selectedReport.reporter?.name} ({selectedReport.reporter?.email})
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Priority</Label>
                    <Badge className={getPriorityColor(selectedReport.priority)}>
                      {selectedReport.priority}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusColor(selectedReport.status)}>
                      {selectedReport.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category</Label>
                    <p className="text-sm capitalize">{selectedReport.category.replace('-', ' ')}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                    {selectedReport.description}
                  </p>
                </div>

                {/* Steps to Reproduce */}
                {selectedReport.steps_to_reproduce && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Steps to Reproduce</Label>
                    <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                      {selectedReport.steps_to_reproduce}
                    </p>
                  </div>
                )}

                {/* Expected vs Actual Behavior */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedReport.expected_behavior && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Expected Behavior</Label>
                      <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                        {selectedReport.expected_behavior}
                      </p>
                    </div>
                  )}
                  {selectedReport.actual_behavior && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Actual Behavior</Label>
                      <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                        {selectedReport.actual_behavior}
                      </p>
                    </div>
                  )}
                </div>

                {/* Technical Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedReport.page_url && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Page URL</Label>
                      <p className="text-sm bg-muted p-2 rounded break-all">
                        {selectedReport.page_url}
                      </p>
                    </div>
                  )}
                  {selectedReport.browser_info && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Browser Info</Label>
                      <p className="text-sm bg-muted p-2 rounded break-all">
                        {selectedReport.browser_info}
                      </p>
                    </div>
                  )}
                </div>

                {/* Resolution Notes */}
                {selectedReport.resolution_notes && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Resolution Notes</Label>
                    <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                      {selectedReport.resolution_notes}
                    </p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <strong>Created:</strong> {format(new Date(selectedReport.created_at), 'PPpp')}
                  </div>
                  <div>
                    <strong>Updated:</strong> {format(new Date(selectedReport.updated_at), 'PPpp')}
                  </div>
                  {selectedReport.resolved_at && (
                    <div>
                      <strong>Resolved:</strong> {format(new Date(selectedReport.resolved_at), 'PPpp')}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[95vw] max-w-2xl">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Bug Report</DialogTitle>
                <DialogDescription>
                  Update the status and details of this bug report
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editingReport.status || selectedReport.status} 
                      onValueChange={(value) => setEditingReport(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="duplicate">Duplicate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select 
                      value={editingReport.priority || selectedReport.priority} 
                      onValueChange={(value) => setEditingReport(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Resolution Notes</Label>
                  <Textarea
                    value={editingReport.resolution_notes || ''}
                    onChange={(e) => setEditingReport(prev => ({ ...prev, resolution_notes: e.target.value }))}
                    placeholder="Add resolution notes or additional comments..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditSubmit}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Report'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBugReportsPage; 