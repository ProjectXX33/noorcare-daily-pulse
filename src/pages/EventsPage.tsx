import React, { useState, useRef, useEffect } from 'react';
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

  const fetchEvents = async () => {
    try {
      const events = await eventService.getEvents();
      setCalendarEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error(t('errorFetchingEvents') || 'Error fetching events');
    }
  };

  // Handle event click (admin only)
  const handleEventClick = (info: any) => {
    if (user?.role === 'admin') {
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

  // Handle date click (admin only)
  const handleDateClick = (info: any) => {
    if (user?.role === 'admin') {
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
    <div className={`container mx-auto py-4 px-2 sm:px-4 space-y-4 ${language === 'ar' ? 'rtl' : 'ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('events')}</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {user?.role === 'admin' && (
            <Button 
              size="sm"
              className="w-full sm:w-auto"
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
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addEvent') || 'Add Event'}
            </Button>
          )}
          <div className="flex border rounded-md">
            <Button
              variant={view === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('calendar')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {view === 'calendar' ? (
        <Card>
          <CardContent className="p-0 sm:p-6">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={language === 'ar' ? 'ar' : 'en'}
              direction={language === 'ar' ? 'rtl' : 'ltr'}
              events={calendarEvents}
              editable={user?.role === 'admin'}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              height="auto"
              headerToolbar={{
                left: language === 'ar' ? 'next prev today' : 'prev next today',
                center: 'title',
                right: 'dayGridMonth'
              }}
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('upcomingEvents') || 'Upcoming Events'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {calendarEvents
                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                    .map(event => (
                      <Card key={event.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold">{event.title}</h3>
                            {user?.role === 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setFormData({
                                    title: event.title,
                                    description: event.description || '',
                                    start: event.start,
                                    end: event.end,
                                  });
                                  setIsDialogOpen(true);
                                }}
                              >
                                {t('edit') || 'Edit'}
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(event.start)}
                            {event.end && ` - ${formatDate(event.end)}`}
                          </p>
                          {event.description && (
                            <p className="text-sm">{event.description}</p>
                          )}
                        </div>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? t('editEvent') || 'Edit Event' : t('addEvent') || 'Add Event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('title') || 'Title'}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('description') || 'Description'}</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">{t('startDate') || 'Start Date'}</Label>
              <Input
                id="start"
                type="datetime-local"
                value={formData.start ? new Date(formData.start).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, start: new Date(e.target.value).toISOString() }))}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">{t('endDate') || 'End Date (Optional)'}</Label>
              <Input
                id="end"
                type="datetime-local"
                value={formData.end ? new Date(formData.end).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  end: e.target.value ? new Date(e.target.value).toISOString() : null 
                }))}
                disabled={isLoading}
              />
            </div>
            <DialogFooter>
              {selectedEvent && user?.role === 'admin' && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="mr-auto flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('delete') || 'Delete'}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
                {t('cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (t('saving') || 'Saving...') : (selectedEvent ? t('save') || 'Save' : t('add') || 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsPage; 