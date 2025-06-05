import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { eventService, Event } from '@/services/eventService';
import { toast } from 'sonner';
import { Calendar, Plus, List, Grid, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

const EventsPage = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const location = useLocation();
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([]);
  const calendarRef = useRef(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    description: '',
    start: new Date().toISOString(),
    end: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle navigation from notification
  useEffect(() => {
    if (location.state?.eventId) {
      const event = calendarEvents.find(e => e.id === location.state.eventId);
      if (event && calendarRef.current) {
        // Set view to calendar if not already
        setView('calendar');
        
        // Get the calendar API
        const calendarApi = calendarRef.current.getApi();
        
        // Navigate to the event's date
        calendarApi.gotoDate(event.start);
        
        // Find the event element and add animation
        setTimeout(() => {
          const eventElement = document.querySelector(`[data-event-id="${event.id}"]`);
          if (eventElement) {
            eventElement.classList.add('animate-pulse', 'bg-primary/20');
            // Remove animation after 2 seconds
            setTimeout(() => {
              eventElement.classList.remove('animate-pulse', 'bg-primary/20');
            }, 2000);
          }
        }, 100);
      }
    }
  }, [location.state?.eventId, calendarEvents]);

  const fetchEvents = async () => {
    try {
      const events = await eventService.getEvents();
      setCalendarEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error(t('errorFetchingEvents') || 'Error fetching events');
    }
  };

  // Handle event click (all users can view info, only admin can edit/delete)
  const handleEventClick = (info: any) => {
    const event = calendarEvents.find(e => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        start: event.start,
        end: event.end,
      });
      setIsDialogOpen(true);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      if (selectedEvent) {
        // Update existing event
        const updatedEvent = await eventService.updateEvent(selectedEvent.id, {
          ...formData,
          created_by: user.id,
        });
        setCalendarEvents(prev =>
          prev.map(event =>
            event.id === selectedEvent.id ? updatedEvent : event
          )
        );
        toast.success(t('eventUpdated') || 'Event updated successfully');
      } else {
        // Create new event
        const newEvent = await eventService.createEvent({
          ...formData,
          created_by: user.id,
        } as Event);
        setCalendarEvents(prev => [...prev, newEvent]);
        toast.success(t('eventCreated') || 'Event created successfully');
      }
      setIsDialogOpen(false);
      setSelectedEvent(null);
      setFormData({
        title: '',
        description: '',
        start: new Date().toISOString(),
        end: null,
      });
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(t('errorSavingEvent') || 'Error saving event');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date click (admin and Media Buyer only)
  const handleDateClick = (info: any) => {
    if (user?.role === 'admin' || user?.position === 'Media Buyer') {
      setSelectedEvent(null);
      setFormData({
        title: '',
        description: '',
        start: info.dateStr,
        end: null,
      });
      setIsDialogOpen(true);
    }
  };

  // Get events for the selected date
  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  // Format date for display
  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  };

  // Add this function:
  const handleDelete = async () => {
    if (!selectedEvent || !user) return;
    if (!window.confirm(t('confirmDelete') || 'Are you sure you want to delete this event?')) return;
    setIsLoading(true);
    try {
      await eventService.deleteEvent(selectedEvent.id);
      setCalendarEvents(prev => prev.filter(event => event.id !== selectedEvent.id));
      toast.success(t('eventDeleted') || 'Event deleted successfully');
      setIsDialogOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(t('errorDeletingEvent') || 'Error deleting event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile-optimized header */}
      <div className="flex flex-col">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
          {t('eventsCalendar') || 'Events Calendar'}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t('manageEvents') || 'View and manage company events and schedules'}
        </p>
      </div>

      {/* Mobile-responsive controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
          {/* View toggle - mobile optimized */}
          <div className="flex rounded-lg border p-1 bg-muted w-fit">
            <Button
              variant={view === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('calendar')}
              className="h-8 px-3 text-xs sm:text-sm min-h-[44px] sm:min-h-auto"
            >
              <Grid className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t('calendar') || 'Calendar'}
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="h-8 px-3 text-xs sm:text-sm min-h-[44px] sm:min-h-auto"
            >
              <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t('list') || 'List'}
            </Button>
          </div>

          {/* Add event button - show for admins and Media Buyers */}
          {(user?.role === 'admin' || user?.position === 'Media Buyer') && (
            <Button
              onClick={() => {
                setSelectedEvent(null);
                setFormData({
                  title: '',
                  description: '',
                  start: new Date().toISOString(),
                  end: null,
                });
                setIsDialogOpen(true);
              }}
              className="min-h-[44px] text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addEvent') || 'Add Event'}
            </Button>
          )}
        </div>

        {/* Mobile events list sheet */}
        <div className="block sm:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full min-h-[44px]">
                <Calendar className="h-4 w-4 mr-2" />
                {t('quickEventList') || 'Quick Events'}
            </Button>
            </SheetTrigger>
            <SheetContent className="w-[85vw] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>{t('upcomingEvents') || 'Upcoming Events'}</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                <div className="space-y-2">
                  {calendarEvents
                    .filter(event => new Date(event.start) >= new Date())
                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                    .slice(0, 10)
                    .map(event => (
                      <div key={event.id} className="p-3 border rounded-lg bg-card">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(event.start)}
                        </p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
          </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Calendar or List View */}
      {view === 'calendar' ? (
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('eventsCalendar') || 'Events Calendar'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile-optimized FullCalendar */}
            <div className="calendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
                events={calendarEvents.map(event => ({
                  id: event.id,
                  title: event.title,
                  start: event.start,
                  end: event.end,
                  backgroundColor: '#22c55e',
                  borderColor: '#16a34a',
                  textColor: '#ffffff',
                  extendedProps: {
                    description: event.description
                  }
                }))}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              headerToolbar={{
                  left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth'
              }}
                height="auto"
                eventDisplay="block"
                dayMaxEvents={3}
                moreLinkClick="popover"
                eventClassNames="cursor-pointer"
                locale={language === 'ar' ? 'ar' : 'en'}
                direction={language === 'ar' ? 'rtl' : 'ltr'}
            />
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Mobile-optimized list view */
          <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <List className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('eventsList') || 'Events List'}
            </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {calendarEvents.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-2">
                    {t('noEvents') || 'No Events'}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-500">
                    {t('noEventsDescription') || 'There are no events scheduled at the moment.'}
                  </p>
                </div>
              ) : (
                calendarEvents
                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                    .map(event => (
                    <div 
                      key={event.id} 
                      className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleEventClick({ event: { id: event.id } })}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm sm:text-base mb-1">{event.title}</h3>
                          {event.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {formatDate(event.start)}
                            </Badge>
                            {event.end && (
                              <Badge variant="outline" className="text-xs">
                                {t('ends') || 'Ends'}: {formatDate(event.end)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                          <Badge 
                            variant={new Date(event.start) > new Date() ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {new Date(event.start) > new Date() ? (t('upcoming') || 'Upcoming') : (t('past') || 'Past')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
              )}
                </div>
            </CardContent>
          </Card>
      )}

      {/* Mobile-optimized Event Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {selectedEvent 
                ? (t('editEvent') || 'Edit Event') 
                : (t('createEvent') || 'Create Event')
              }
              </DialogTitle>
            </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="title" className="text-xs sm:text-sm">
                    {t('title') || 'Title'}
                  </Label>
                  <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                className="h-9 text-sm"
                  />
                </div>
            
            <div>
              <Label htmlFor="description" className="text-xs sm:text-sm">
                    {t('description') || 'Description'}
                  </Label>
                  <Textarea
                id="description"
                    value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="text-sm resize-none"
                  />
                </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="start" className="text-xs sm:text-sm">
                    {t('startDate') || 'Start Date'}
                  </Label>
                  <Input
                  id="start"
                    type="datetime-local"
                    value={formData.start ? new Date(formData.start).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
                    required
                  className="h-9 text-sm"
                  />
                </div>
              
              <div>
                <Label htmlFor="end" className="text-xs sm:text-sm">
                  {t('endDate') || 'End Date'}
                  </Label>
                  <Input
                  id="end"
                    type="datetime-local"
                    value={formData.end ? new Date(formData.end).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value || null }))}
                  className="h-9 text-sm"
                  />
                </div>
              </div>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                {selectedEvent && (user?.role === 'admin' || user?.position === 'Media Buyer') && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isLoading}
                  className="min-h-[44px] text-sm w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('delete') || 'Delete'}
                  </Button>
                )}
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="min-h-[44px] text-sm flex-1 sm:flex-none"
                >
                  {t('cancel') || 'Cancel'}
                </Button>
                {(user?.role === 'admin' || user?.position === 'Media Buyer') && (
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="min-h-[44px] text-sm flex-1 sm:flex-none"
                  >
                    {isLoading 
                      ? (t('saving') || 'Saving...') 
                      : selectedEvent 
                        ? (t('update') || 'Update') 
                        : (t('create') || 'Create')
                    }
                  </Button>
                )}
              </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default EventsPage; 