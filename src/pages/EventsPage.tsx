import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Edit, Trash2, Clock, User, AlertCircle, Eye, Grid, CalendarDays, MapPin, Filter, Search, ChevronLeft, ChevronRight, Check, X as XIcon, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Calendar imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// API functions
import { eventService, Event, EventQA } from '@/services/eventService';
import { playNotificationSound } from '@/lib/notifications';
import EventQAComponent from '@/components/EventQAComponent';

const EventsPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'cards'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'ongoing' | 'past'>('all');
  const [isMobile, setIsMobile] = useState(false);

  const getStatusBadgeClass = (status: 'active' | 'paused' | 'finished' | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-slate-800 dark:text-white dark:border-slate-600 border-blue-300 shadow-sm';
      case 'paused':
        return 'bg-red-100 text-red-800 dark:bg-slate-800 dark:text-white dark:border-slate-600 border-red-300 shadow-sm';
      case 'finished':
        return 'bg-green-100 text-green-800 dark:bg-slate-800 dark:text-white dark:border-slate-600 border-green-300 shadow-sm';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-white dark:border-slate-600 border-gray-300 shadow-sm';
    }
  };

  // Event form state
  const [eventForm, setEventForm] = useState<{
    title: string;
    description: string;
    start: string;
    end: string;
    status: 'active' | 'paused' | 'finished';
  }>({
    title: '',
    description: '',
    start: new Date().toISOString().slice(0, 16),
    end: '',
    status: 'active'
  });

  // Only Admins and Media Buyers can edit events - all other employees are view-only
  const canEditEvents = user && (user.role === 'admin' || user.position === 'Media Buyer');
  
  // ALL employees can VIEW Q&A, but only admin and copy writing can edit/add/delete
  const canViewQA = user && user.role === 'employee'; // All employees can view
  const canEditQA = user && (user.role === 'admin' || user.position === 'Copy Writing'); // Only admin and copy writing can edit
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filtered and searched events
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      const now = new Date();
      filtered = filtered.filter(event => {
        const startDate = new Date(event.start);
        const endDate = event.end ? new Date(event.end) : startDate;
        
        switch (filterStatus) {
          case 'upcoming':
            return startDate > now;
          case 'ongoing':
            return startDate <= now && endDate >= now;
          case 'past':
            return endDate < now;
          default:
            return true;
        }
      });
    }
    
    // ✅ All employees can now see all events regardless of status
    // Removed the restriction that only showed active events to regular employees
    
    return filtered;
  }, [events, searchQuery, filterStatus, user]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Permission Debug:', {
      userId: user?.id,
      userRole: user?.role,
      userPosition: user?.position,
      canEditEvents,
      isViewOnly,
      isAdmin: user?.role === 'admin',
      isMediaBuyer: user?.position === 'Media Buyer'
    });
  }, [user, canEditEvents, isViewOnly]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const eventsData = await eventService.getEvents(true); // Include Q&A
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Failed to load events');
    }
  };

  const handleEventClick = (info: { event: { id: string } }) => {
    const event = events.find(e => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setEventForm({
        title: event.title,
        description: event.description || '',
        start: new Date(event.start).toISOString().slice(0, 16),
        end: event.end ? new Date(event.end).toISOString().slice(0, 16) : '',
        status: event.status || 'active'
      });
      
      // BULLETPROOF: Force view-only mode for non-privileged users
      const isAdmin = user?.role === 'admin';
      const isMediaBuyer = user?.position === 'Media Buyer';
      const shouldBeViewOnly = !isAdmin && !isMediaBuyer;
      
      console.log('🔍 Event Click Debug:', {
        canEditEvents,
        shouldBeViewOnly,
        userRole: user?.role,
        userPosition: user?.position,
        isAdmin,
        isMediaBuyer,
        finalViewOnlyState: shouldBeViewOnly
      });
      
      // Force set view-only for non-privileged users
      setIsViewOnly(shouldBeViewOnly);
      
      // Add a small delay to ensure state updates properly
      setTimeout(() => {
        setIsEventDialogOpen(true);
      }, 10);
    }
  };

  const handleDateClick = (info: { dateStr: string }) => {
    console.log('📅 Date Click Attempt:', {
      canEditEvents,
      userRole: user?.role,
      userPosition: user?.position
    });
    
    // Only allow creating events if user has edit permissions
    if (!canEditEvents) {
      toast.error('You do not have permission to create events');
      console.log('❌ Date click blocked - insufficient permissions');
      return;
    }
    
    setSelectedEvent(null);
    setEventForm({
      title: '',
      description: '',
      start: info.dateStr + 'T09:00',
      end: '',
      status: 'active'
    });
    setIsViewOnly(false);
    setIsEventDialogOpen(true);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Form Submit Attempt:', {
      canEditEvents,
      isViewOnly,
      userRole: user?.role,
      userPosition: user?.position
    });
    
    // Triple check permissions and view-only mode
    if (!user || !canEditEvents || isViewOnly) {
      toast.error('You do not have permission to edit events');
      console.log('❌ Form submission blocked - insufficient permissions');
      return;
    }

    // Additional role check as safety - only Admins and Media Buyers
    if (user.role !== 'admin' && user.position !== 'Media Buyer') {
      toast.error('Access denied: Only Admins and Media Buyers can edit events');
      console.log('❌ Form submission blocked - not an Admin or Media Buyer');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedEvent) {
        // Update existing event
        const updatedEvent = await eventService.updateEvent(selectedEvent.id, {
          ...eventForm,
          status: eventForm.status as 'active' | 'paused' | 'finished',
          created_by: user.id,
        });
        setEvents(prev => prev.map(event => 
          event.id === selectedEvent.id ? updatedEvent : event
        ));
        toast.success('Event updated successfully');
      } else {
        // Create new event
        const newEvent = await eventService.createEvent({
          title: eventForm.title,
          description: eventForm.description,
          start: eventForm.start,
          end: eventForm.end,
          status: eventForm.status as 'active' | 'paused' | 'finished',
          created_by: user.id,
        });
        setEvents(prev => [...prev, newEvent]);
        toast.success('Event created successfully');
      }
      setIsEventDialogOpen(false);
      resetEventForm();
      playNotificationSound();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Error saving event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventDelete = async () => {
    if (!selectedEvent || !canEditEvents) {
      toast.error('You do not have permission to delete events');
      return;
    }

    // Additional role check as safety - only Admins and Media Buyers
    if (user?.role !== 'admin' && user?.position !== 'Media Buyer') {
      toast.error('Access denied: Only Admins and Media Buyers can delete events');
      return;
    }

    setIsLoading(true);
    try {
      await eventService.deleteEvent(selectedEvent.id);
      setEvents(prev => prev.filter(event => event.id !== selectedEvent.id));
      toast.success('Event deleted successfully');
      setIsEventDialogOpen(false);
      resetEventForm();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error deleting event');
    } finally {
      setIsLoading(false);
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      start: new Date().toISOString().slice(0, 16),
      end: '',
      status: 'active'
    });
    setSelectedEvent(null);
  };

  // Handle Q&A updates
  const handleQAUpdate = (updatedQA: EventQA[]) => {
    if (selectedEvent) {
      const updatedEvent = { ...selectedEvent, qa: updatedQA };
      setSelectedEvent(updatedEvent);
      
      // Update the event in the main events list
      setEvents(prev => prev.map(event => 
        event.id === selectedEvent.id ? updatedEvent : event
      ));
    }
  };

  const handleStatusChange = (value: 'active' | 'paused' | 'finished') => {
    setEventForm(prev => ({ ...prev, status: value }));
  };

  // Prevent any form changes for non-privileged users
  const handleInputChange = (field: string, value: string | number | boolean) => {
    console.log('⌨️ Input Change Attempt:', {
      field,
      canEditEvents,
      isViewOnly,
      userRole: user?.role,
      userPosition: user?.position
    });
    
    if (!canEditEvents || isViewOnly) {
      toast.error('You do not have permission to edit events');
      console.log('❌ Input change blocked');
      return;
    }

    if (field === 'status') {
      if (value === 'active' || value === 'paused' || value === 'finished') {
        handleStatusChange(value as 'active' | 'paused' | 'finished');
      }
    } else {
      setEventForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleEventDidMount = (info: { event: any; el: HTMLElement }) => {
    // Add tooltip
    if (info.event.title) {
      info.el.setAttribute('title', `${info.event.title}\n${info.event.start?.toLocaleString()}`);
    }

    // Apply custom class based on event status
    const status = info.event.extendedProps.status || 'active';
    info.el.classList.add(`event-status-${status}`);
  };

  const renderEventContent = (eventInfo: any) => {
    const status = eventInfo.event.extendedProps.status || 'active';
    return (
      <div className="flex items-center justify-between w-full overflow-hidden p-1">
        <span className="truncate flex-grow" style={{ color: '#1f2937' }}>{eventInfo.event.title}</span>
        <Badge 
          className={`capitalize text-xs ml-2 shrink-0 border ${
            status === 'active' ? 'bg-blue-200 text-blue-800 border-blue-300' :
            status === 'paused' ? 'bg-red-200 text-red-800 border-red-300' :
            'bg-green-200 text-green-800 border-green-300'
          }`}
        >
          {status}
        </Badge>
      </div>
    );
  };

  const calendarEvents = useMemo(() => {
    return filteredEvents.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end || event.start,
      extendedProps: {
        status: event.status || 'active'
      }
    }));
  }, [filteredEvents]);

  // Check if user has any access (all authenticated users can view)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-6 text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Access Denied</h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Please login to view events.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Enhanced mobile-optimized header */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          {/* Main Header */}
          <div className="flex flex-col gap-4 w-full">
            {/* Title and Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
              <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                  Events
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  {canEditEvents ? 'Manage company events and schedule important activities' : 'View company events and scheduled activities'}
                </p>
              </div>
              {canEditEvents && (
                <Button 
                  onClick={() => setIsEventDialogOpen(true)} 
                  className="min-h-[44px] w-full sm:w-auto shrink-0"
                  size={isMobile ? "lg" : "default"}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              )}
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 sm:h-9"
                />
              </div>
              
              {/* Filter Dropdown */}
              <div className="flex gap-2 sm:gap-3 shrink-0">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'upcoming' | 'ongoing' | 'past')}
                  className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[100px]"
                >
                  <option value="all">All Events</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="past">Past</option>
                </select>
                
                {/* View Mode Toggle */}
                <div className="flex rounded-md bg-muted p-1">
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                    className="h-8 px-2 sm:px-3"
                  >
                    <Calendar className="h-4 w-4 sm:mr-1" />
                    {!isMobile && <span>Calendar</span>}
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="h-8 px-2 sm:px-3"
                  >
                    <Grid className="h-4 w-4 sm:mr-1" />
                    {!isMobile && <span>Cards</span>}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Permission Notice for non-editors */}
          {!canEditEvents && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">View-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                You can view events but cannot create, edit, or delete them. Contact an admin or media buyer for changes.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Events Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {events.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Events</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {events.filter(e => {
                      const eventDate = new Date(e.start);
                      const today = new Date();
                      // Compare dates only (start of day)
                      const eventStartOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                      const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      return eventStartOfDay >= todayStartOfDay;
                    }).length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Upcoming</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {events.filter(e => e.created_by === user?.id).length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">My Events</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Calendar or Cards View */}
        {viewMode === 'calendar' ? (
          <Card className="w-full">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-5 w-5" />
                Event Calendar
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 md:p-6">
              <div className="bg-background border rounded-lg overflow-hidden">
                <style>{`
                  .fc {
                    font-family: inherit;
                  }
                  
                  /* Override FullCalendar's responsive behavior completely */
                  .fc .fc-toolbar {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: nowrap !important;
                  }
                  
                  .fc .fc-toolbar-chunk {
                    display: flex !important;
                  }
                  
                  /* Disable FullCalendar's built-in responsive behavior */
                  .fc-media-screen .fc-scroller-harness {
                    overflow: visible !important;
                  }
                  
                  /* Force all toolbar elements to be visible on ALL screen sizes */
                  .fc-toolbar-chunk,
                  .fc-toolbar-title,
                  .fc-prev-button,
                  .fc-next-button {
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                  }
                  
                  /* Force mobile layout on small screens - Override FullCalendar completely */
                  @media (max-width: 640px) {
                    /* Force all toolbar chunks to be visible */
                    .fc-toolbar-chunk {
                      display: flex !important;
                      visibility: visible !important;
                      opacity: 1 !important;
                      position: static !important;
                      width: auto !important;
                      height: auto !important;
                    }
                    
                    /* Force title to be visible and centered */
                    .fc-toolbar-chunk:nth-child(2) {
                      display: flex !important;
                      flex: 1 !important;
                    }
                    
                    .fc-toolbar-chunk:nth-child(2) .fc-toolbar-title {
                      display: block !important;
                      visibility: visible !important;
                      opacity: 1 !important;
                      width: 100% !important;
                      text-align: center !important;
                    }
                    
                    /* Force navigation buttons to be visible */
                    .fc-prev-button, .fc-next-button {
                      display: inline-flex !important;
                      visibility: visible !important;
                      opacity: 1 !important;
                      position: static !important;
                      width: auto !important;
                      height: auto !important;
                    }
                    
                    /* Hide any FullCalendar responsive overrides */
                    .fc-media-screen .fc-toolbar > * {
                      display: flex !important;
                    }
                  }
                  
                  /* Global toolbar styles */
                  .fc-toolbar {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    flex-wrap: nowrap !important;
                    gap: ${isMobile ? '8px' : '16px'} !important;
                    margin-bottom: 16px !important;
                    padding: ${isMobile ? '12px 8px' : '12px 0'} !important;
                  }
                  
                  .fc-toolbar-chunk {
                    display: flex !important;
                    align-items: center !important;
                    margin: 0 !important;
                  }
                  
                  .fc-toolbar-title {
                    font-size: ${isMobile ? '1.25rem' : '1.5rem'} !important;
                    font-weight: 600 !important;
                    color: hsl(var(--foreground)) !important;
                    margin: 0 !important;
                    text-align: center !important;
                    white-space: nowrap !important;
                  }
                  
                  .fc-button {
                    background: hsl(var(--primary)) !important;
                    border: 1px solid hsl(var(--primary)) !important;
                    color: hsl(var(--primary-foreground)) !important;
                    padding: ${isMobile ? '8px 12px' : '10px 18px'} !important;
                    font-size: ${isMobile ? '0.875rem' : '0.95rem'} !important;
                    border-radius: 6px !important;
                    transition: all 0.2s ease !important;
                    margin: 0 !important;
                    min-width: ${isMobile ? '44px' : '50px'} !important;
                    height: ${isMobile ? '44px' : 'auto'} !important;
                  }
                  
                  .fc-button:hover {
                    background: hsl(var(--primary))/90 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                  }
                  
                  .fc-button:disabled {
                    background: hsl(var(--muted)) !important;
                    border-color: hsl(var(--muted)) !important;
                    color: hsl(var(--muted-foreground)) !important;
                  }
                  
                  .fc-button-active {
                    background: hsl(var(--primary)) !important;
                    border-color: hsl(var(--primary)) !important;
                  }
                  
                  .fc-prev-button, .fc-next-button {
                    font-weight: 600 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                  }
                  
                  .fc-today-button {
                    font-weight: 500 !important;
                  }
                  
                  /* Event styles */
                  .fc-event {
                    background: hsl(var(--primary)) !important;
                    border: 1px solid hsl(var(--primary)) !important;
                    color: hsl(var(--primary-foreground)) !important;
                    border-radius: 4px !important;
                    font-size: ${isMobile ? '0.75rem' : '0.875rem'} !important;
                    padding: 2px 4px !important;
                    margin: 1px !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                  }
                  
                  .fc-event:hover {
                    background: hsl(var(--primary))/90 !important;
                    transform: scale(1.02);
                  }
                  
                  .fc-event-title {
                    font-weight: 500 !important;
                  }
                  
                  /* Calendar cell styles */
                  .fc-daygrid-day {
                    background: hsl(var(--background)) !important;
                    border-color: hsl(var(--border)) !important;
                  }
                  
                  .fc-daygrid-day:hover {
                    background: hsl(var(--accent))/5 !important;
                  }
                  
                  .fc-day-today {
                    background: hsl(var(--accent))/15 !important;
                  }
                  
                  .fc-col-header-cell {
                    background: hsl(var(--accent))/10 !important;
                    border-color: hsl(var(--border)) !important;
                    font-weight: 600 !important;
                    color: hsl(var(--foreground)) !important;
                    padding: ${isMobile ? '8px 4px' : '12px 8px'} !important;
                  }
                  
                  .fc-daygrid-day-number {
                    color: hsl(var(--foreground)) !important;
                    font-weight: 500 !important;
                    padding: ${isMobile ? '4px' : '8px'} !important;
                  }
                  
                  .fc-daygrid-other-month {
                    background: hsl(var(--muted))/5 !important;
                  }
                  
                  .fc-daygrid-other-month .fc-daygrid-day-number {
                    color: hsl(var(--muted-foreground)) !important;
                    opacity: 0.7 !important;
                  }
                  
                  .fc-scrollgrid {
                    border-color: hsl(var(--border)) !important;
                  }
                  
                  .fc-scrollgrid td, .fc-scrollgrid th {
                    border-color: hsl(var(--border)) !important;
                  }

                  /* Event status colors */
                  .event-status-active {
                    background: hsl(217 91% 60% / 0.1) !important;
                    border: 1px solid hsl(217 91% 60% / 0.3) !important;
                    color: hsl(217 91% 60%) !important;
                    box-shadow: 0 1px 3px hsl(217 91% 60% / 0.1) !important;
                  }
                  
                  .dark .event-status-active {
                    background: hsl(215 28% 17%) !important;
                    border-color: hsl(215 20% 25%) !important;
                    color: white !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
                  }

                  .event-status-paused {
                    background: hsl(0 84% 60% / 0.1) !important;
                    border: 1px solid hsl(0 84% 60% / 0.3) !important;
                    color: hsl(0 84% 60%) !important;
                    box-shadow: 0 1px 3px hsl(0 84% 60% / 0.1) !important;
                  }

                  .dark .event-status-paused {
                    background: hsl(215 28% 17%) !important;
                    border-color: hsl(215 20% 25%) !important;
                    color: white !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
                  }

                  .event-status-finished {
                    background: hsl(142 76% 36% / 0.1) !important;
                    border: 1px solid hsl(142 76% 36% / 0.3) !important;
                    color: hsl(142 76% 36%) !important;
                    box-shadow: 0 1px 3px hsl(142 76% 36% / 0.1) !important;
                  }

                  .dark .event-status-finished {
                    background: hsl(215 28% 17%) !important;
                    border-color: hsl(215 20% 25%) !important;
                    color: white !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
                  }

                  /* Status badge styles */
                  .status-badge-active {
                    background: hsl(217 91% 60% / 0.1);
                    color: hsl(217 91% 60%);
                    padding: 4px 12px;
                    border-radius: 12px;
                    border: 1px solid hsl(217 91% 60% / 0.3);
                    font-weight: 600;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    box-shadow: 0 1px 3px hsl(217 91% 60% / 0.1);
                    transition: all 0.2s ease;
                  }

                  .dark .status-badge-active {
                    background: hsl(215 28% 17%);
                    color: white;
                    border-color: hsl(215 20% 25%);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  }

                  .status-badge-paused {
                    background: hsl(0 84% 60% / 0.1);
                    color: hsl(0 84% 60%);
                    padding: 4px 12px;
                    border-radius: 12px;
                    border: 1px solid hsl(0 84% 60% / 0.3);
                    font-weight: 600;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    box-shadow: 0 1px 3px hsl(0 84% 60% / 0.1);
                    transition: all 0.2s ease;
                  }

                  .dark .status-badge-paused {
                    background: hsl(215 28% 17%);
                    color: white;
                    border-color: hsl(215 20% 25%);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  }

                  .status-badge-finished {
                    background: hsl(142 76% 36% / 0.1);
                    color: hsl(142 76% 36%);
                    padding: 4px 12px;
                    border-radius: 12px;
                    border: 1px solid hsl(142 76% 36% / 0.3);
                    font-weight: 600;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    box-shadow: 0 1px 3px hsl(142 76% 36% / 0.1);
                    transition: all 0.2s ease;
                  }

                  .dark .status-badge-finished {
                    background: hsl(215 28% 17%);
                    color: white;
                    border-color: hsl(215 20% 25%);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  }

                  /* Status badge hover effects */
                  .status-badge-active:hover,
                  .status-badge-paused:hover,
                  .status-badge-finished:hover {
                    transform: scale(1.05);
                    filter: brightness(1.1);
                  }

                  .dark .status-badge-active:hover,
                  .dark .status-badge-paused:hover,
                  .dark .status-badge-finished:hover {
                    background: hsl(215 28% 22%);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                  }

                  /* Calendar navigation */
                  .fc .fc-button-primary {
                    background: hsl(var(--primary)) !important;
                    border-color: hsl(var(--primary)) !important;
                    color: hsl(var(--primary-foreground)) !important;
                  }

                  .fc .fc-button-primary:hover {
                    background: hsl(var(--primary) / 0.9) !important;
                  }

                  .fc .fc-button-primary:disabled {
                    background: hsl(var(--primary) / 0.5) !important;
                  }

                  /* Calendar base styles for dark mode */
                  .dark .fc {
                    color: hsl(var(--foreground)) !important;
                  }

                  .dark .fc-toolbar-title {
                    color: white !important;
                  }

                  .dark .fc-col-header-cell {
                    color: white !important;
                    background: hsl(var(--primary)/0.15) !important;
                  }

                  .dark .fc-daygrid-day-number {
                    color: white !important;
                  }

                  .dark .fc-day-other .fc-daygrid-day-number {
                    color: hsl(var(--muted-foreground)) !important;
                  }

                  /* Event hover effects in dark mode */
                  .dark .fc-event:hover {
                    filter: brightness(1.2) !important;
                  }
                `}</style>
                <FullCalendar
                  key={`calendar-${isMobile ? 'mobile' : 'desktop'}-${viewMode}`}
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  events={calendarEvents}
                  eventClick={handleEventClick}
                  dateClick={canEditEvents ? handleDateClick : undefined}
                  height={isMobile ? "auto" : "auto"}
                  aspectRatio={isMobile ? 1.0 : 1.35}
                  headerToolbar={{
                    left: isMobile ? 'prev' : 'prev,next today',
                    center: 'title',
                    right: isMobile ? 'next' : ''
                  }}
                  footerToolbar={isMobile ? {
                    center: 'today'
                  } : undefined}
                  eventDisplay="block"
                  displayEventTime={!isMobile}
                  dayMaxEvents={isMobile ? 2 : 4}
                  moreLinkClick="popover"
                  moreLinkText={(num) => `+${num} more`}
                  editable={canEditEvents}
                  selectable={canEditEvents}
                  selectMirror={true}
                  dayHeaderFormat={isMobile ? { weekday: 'narrow' } : { weekday: 'short' }}
                  eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short'
                  }}
                  slotLabelFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short'
                  }}
                  eventDidMount={handleEventDidMount}
                  eventContent={renderEventContent}
                />
              </div>
              
              {/* Mobile Quick Actions */}
              {isMobile && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {canEditEvents && (
                    <Button 
                      onClick={() => setIsEventDialogOpen(true)}
                      size="sm"
                      className="flex-1 min-w-[120px]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Quick Add
                    </Button>
                  )}
                  <Button 
                    onClick={() => setViewMode('cards')}
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[120px]"
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    Cards View
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Cards View */
          <div className="space-y-4 w-full">
            {/* Cards Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Grid className="h-5 w-5" />
                  Event Cards
                </h2>
                {searchQuery && (
                  <span className="text-sm text-muted-foreground">
                    (filtered)
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-muted-foreground">
                <span>{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}</span>
                {isMobile && (
                  <Button 
                    onClick={() => setViewMode('calendar')}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar View
                  </Button>
                )}
              </div>
            </div>
            
            {filteredEvents.length === 0 ? (
              <Card className="w-full">
                <CardContent className="p-8 sm:p-12 text-center">
                  <CalendarDays className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl sm:text-2xl font-medium text-muted-foreground mb-3">
                    {searchQuery || filterStatus !== 'all' ? 'No Events Found' : 'No Events Yet'}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                    {searchQuery || filterStatus !== 'all' 
                      ? 'Try adjusting your search or filter criteria' 
                      : canEditEvents 
                        ? 'Create your first event to get started' 
                        : 'No events have been scheduled yet'
                    }
                  </p>
                  {(searchQuery || filterStatus !== 'all') && (
                    <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                      {searchQuery && (
                        <Button 
                          onClick={() => setSearchQuery('')}
                          variant="outline"
                          size="sm"
                        >
                          Clear Search
                        </Button>
                      )}
                      {filterStatus !== 'all' && (
                        <Button 
                          onClick={() => setFilterStatus('all')}
                          variant="outline"
                          size="sm"
                        >
                          Show All Events
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredEvents.map((event) => (
                  <Card 
                    key={event.id} 
                    className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-primary/20 w-full"
                    onClick={() => handleEventClick({ event: { id: event.id } })}
                  >
                    <CardHeader className="pb-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                          {event.title}
                        </CardTitle>
                        {canEditEvents && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick({ event: { id: event.id } });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Activity / Status Badges */}
                      <div className="flex justify-start">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold w-fit border transition-all duration-200 hover:scale-105 ${
                          event.status === 'active'
                            ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-slate-800 dark:text-white dark:border-slate-600 shadow-sm'
                            : event.status === 'finished'
                            ? 'bg-green-100 text-green-800 border-green-300 dark:bg-slate-800 dark:text-white dark:border-slate-600 shadow-sm'
                            : 'bg-red-100 text-red-800 border-red-300 dark:bg-slate-800 dark:text-white dark:border-slate-600 shadow-sm'
                        }`}>
                          {event.status === 'active' ? 'Active' : event.status === 'finished' ? 'Finished' : 'Paused'}
                        </span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 space-y-4">
                      {event.description && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-foreground">Start</div>
                              <div className="text-muted-foreground text-xs sm:text-sm truncate">
                                {new Date(event.start).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          {event.end && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-foreground">End</div>
                                <div className="text-muted-foreground text-xs sm:text-sm truncate">
                                  {new Date(event.end).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick({ event: { id: event.id } });
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {canEditEvents && (user?.role === 'admin' || user?.position === 'Media Buyer') ? 'Edit Details' : 'View Details'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[600px] lg:max-w-[700px] max-h-[95vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {isViewOnly ? (
                <>
                  <Eye className="h-5 w-5 flex-shrink-0 text-blue-600" />
                  <span>View Event Details</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    View Only
                  </span>
                </>
              ) : (
                <>
                  <Calendar className="h-5 w-5 flex-shrink-0" />
                  {selectedEvent ? 'Edit Event' : 'Create Event'}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {(() => {
            console.log('🔍 Dialog Render Debug:', {
              isViewOnly,
              userRole: user?.role,
              userPosition: user?.position,
              canEditEvents
            });
            return null;
          })()}

          {(isViewOnly || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) ? (
            /* View-Only Display */
            <div className="space-y-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Event Title</Label>
                <div className="p-3 bg-white dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600">
                  <p className="text-slate-900 dark:text-slate-100 font-medium">
                    {eventForm.title || 'No title'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</Label>
                <div className="p-3 bg-white dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 min-h-[80px]">
                  <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                    {eventForm.description || 'No description'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Start Date & Time</Label>
                  <div className="p-3 bg-white dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600">
                    <p className="text-slate-900 dark:text-slate-100">
                      {new Date(eventForm.start).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">End Date & Time</Label>
                  <div className="p-3 bg-white dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600">
                    <p className="text-slate-900 dark:text-slate-100">
                      {eventForm.end ? new Date(eventForm.end).toLocaleString() : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-medium">View-Only Access</span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  You can view this event but cannot make changes. Only Admins and Media Buyers can edit events.
                </p>
              </div>

              {/* Q&A Section for View-Only */}
              {selectedEvent && canViewQA && (
                <div className="border-t pt-6">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      💬 Event Q&A
                      {canEditQA && (
                        <Badge variant="secondary" className="text-xs">
                          {user?.position === 'Copy Writing' ? 'Copy Writing Access' : 'Admin Access'}
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {canEditQA 
                        ? 'You can add questions and answers about this event'
                        : 'View questions and answers about this event (read-only)'
                      }
                    </p>
                  </div>
                  <EventQAComponent
                    eventId={selectedEvent.id}
                    eventTitle={selectedEvent.title}
                    qa={selectedEvent.qa || []}
                    onQAUpdate={handleQAUpdate}
                    isViewOnly={!canEditQA} // Only allow editing for admin and copy writing
                  />
                </div>
              )}
            </div>
          ) : (
            /* Edit Form for Admins and Media Buyers Only */
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                // Bulletproof permission check
                if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                  toast.error('Access denied: Only Admins and Media Buyers can edit events');
                  return;
                }
                handleEventSubmit(e);
              }}
              onKeyDown={(e) => {
                // Block ALL keyboard interactions for non-privileged users
                if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                  e.preventDefault();
                  e.stopPropagation();
                  toast.error('Access denied: Only Admins and Media Buyers can edit events');
                  return;
                }
                // Block Enter key submission for non-privileged users
                if (e.key === 'Enter' && (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer'))) {
                  e.preventDefault();
                  e.stopPropagation();
                  toast.error('Access denied: Only Admins and Media Buyers can edit events');
                  return;
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Event Title</Label>
                <Input
                  id="title"
                  value={eventForm.title}
                  onChange={(e) => {
                    if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                      e.preventDefault();
                      toast.error('Access denied: Only Admins and Media Buyers can edit events');
                      return;
                    }
                    setEventForm(prev => ({ ...prev, title: e.target.value }));
                  }}
                  onKeyDown={(e) => {
                    if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                      e.preventDefault();
                      e.stopPropagation();
                      toast.error('Access denied: Only Admins and Media Buyers can edit events');
                    }
                  }}
                  onFocus={(e) => {
                    if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                      e.target.blur();
                      toast.error('Access denied: Only Admins and Media Buyers can edit events');
                    }
                  }}
                  placeholder="Enter event title"
                  className="min-h-[44px]"
                  required
                  disabled={!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')}
                  readOnly={!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) => {
                    if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                      e.preventDefault();
                      toast.error('Access denied: Only Admins and Media Buyers can edit events');
                      return;
                    }
                    setEventForm(prev => ({ ...prev, description: e.target.value }));
                  }}
                  onKeyDown={(e) => {
                    if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                      e.preventDefault();
                      e.stopPropagation();
                      toast.error('Access denied: Only Admins and Media Buyers can edit events');
                    }
                  }}
                  onFocus={(e) => {
                    if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                      e.target.blur();
                      toast.error('Access denied: Only Admins and Media Buyers can edit events');
                    }
                  }}
                  placeholder="Enter event description"
                  rows={3}
                  disabled={!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')}
                  readOnly={!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start" className="text-sm font-medium">Start Date & Time</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={eventForm.start}
                    onChange={(e) => {
                      if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                        e.preventDefault();
                        toast.error('Access denied: Only Admins and Media Buyers can edit events');
                        return;
                      }
                      setEventForm(prev => ({ ...prev, start: e.target.value }));
                    }}
                    onKeyDown={(e) => {
                      if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                        e.preventDefault();
                        e.stopPropagation();
                        toast.error('Access denied: Only Admins and Media Buyers can edit events');
                      }
                    }}
                    onFocus={(e) => {
                      if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                        e.target.blur();
                        toast.error('Access denied: Only Admins and Media Buyers can edit events');
                      }
                    }}
                    className="min-h-[44px]"
                    required
                    disabled={!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')}
                    readOnly={!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end" className="text-sm font-medium">End Date & Time (Optional)</Label>
                  <Input
                    id="end"
                    type="datetime-local"
                    value={eventForm.end}
                    onChange={(e) => {
                      if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                        e.preventDefault();
                        toast.error('Access denied: Only Admins and Media Buyers can edit events');
                        return;
                      }
                      setEventForm(prev => ({ ...prev, end: e.target.value }));
                    }}
                    onKeyDown={(e) => {
                      if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                        e.preventDefault();
                        e.stopPropagation();
                        toast.error('Access denied: Only Admins and Media Buyers can edit events');
                      }
                    }}
                    onFocus={(e) => {
                      if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')) {
                        e.target.blur();
                        toast.error('Access denied: Only Admins and Media Buyers can edit events');
                      }
                    }}
                    className="min-h-[44px]"
                    disabled={!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')}
                    readOnly={!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')}
                  />
                </div>
              </div>

              {/* Active Toggle (Admin/Media Buyer only) */}
              {!isViewOnly && canEditEvents && (
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                  <div className="flex items-center gap-3">
                    <Select
                      value={eventForm.status}
                      onValueChange={(value) => {
                        if (value === 'active' || value === 'paused' || value === 'finished') {
                          handleStatusChange(value as 'active' | 'paused' | 'finished');
                        }
                      }}
                    >
                      <SelectTrigger className="w-full capitalize">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="finished">Finished</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge className={`${getStatusBadgeClass(eventForm.status)} capitalize shrink-0`}>
                      {eventForm.status}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Q&A Section for Edit Mode */}
              {selectedEvent && canEditQA && (
                <div className="border-t pt-6">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      💬 Event Q&A
                      {canEditQA && (
                        <Badge variant="secondary" className="text-xs">
                          {user?.position === 'Copy Writing' ? 'Copy Writing Access' : 'Admin Access'}
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {canEditQA 
                        ? 'You can add questions and answers about this event'
                        : 'View questions and answers about this event (read-only)'
                      }
                    </p>
                  </div>
                  <EventQAComponent
                    eventId={selectedEvent.id}
                    eventTitle={selectedEvent.title}
                    qa={selectedEvent.qa || []}
                    onQAUpdate={handleQAUpdate}
                    isViewOnly={!canEditQA}
                  />
                </div>
              )}
            </form>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEventDialogOpen(false)}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {isViewOnly ? 'Close' : 'Cancel'}
            </Button>
            
            {!isViewOnly && (
              <>
                {selectedEvent && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleEventDelete}
                    disabled={isLoading}
                    className="min-h-[44px] w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Event
                  </Button>
                )}
                
                <Button
                  type="submit"
                  disabled={isLoading || !canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer')}
                  className="min-h-[44px] w-full sm:w-auto"
                  onClick={(e) => {
                    if (!canEditEvents || (user?.role !== 'admin' && user?.position !== 'Media Buyer') || isViewOnly) {
                      e.preventDefault();
                      toast.error('Access denied: Only Admins and Media Buyers can edit events');
                      return;
                    }
                    handleEventSubmit(e);
                  }}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      {selectedEvent ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {selectedEvent ? (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Update Event
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Event
                        </>
                      )}
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsPage; 