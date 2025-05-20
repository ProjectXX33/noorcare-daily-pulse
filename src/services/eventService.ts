import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string | null;
  created_by: string | null;
  created_at: string;
}

// Function to create notifications for all users
async function createEventNotifications(event: Event) {
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id');

    if (usersError) throw usersError;

    // Create notifications for all users
    for (const user of users) {
      await createNotification({
        user_id: user.id,
        title: 'New Event Created',
        message: `A new event "${event.title}" has been added to the calendar`,
        related_to: 'event',
        related_id: event.id
      });
    }
  } catch (error) {
    console.error('Error creating event notifications:', error);
    // Don't throw the error - we don't want to fail event creation if notifications fail
  }
}

export const eventService = {
  // Get all events
  async getEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start', { ascending: true });

    if (error) throw error;
    return data as Event[];
  },

  // Create a new event
  async createEvent(event: Omit<Event, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('events')
      .insert([event])
      .select()
      .single();

    if (error) throw error;

    // Create notifications for all users
    await createEventNotifications(data as Event);

    return data as Event;
  },

  // Update an existing event
  async updateEvent(id: string, event: Partial<Event>) {
    const { data, error } = await supabase
      .from('events')
      .update(event)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Event;
  },

  // Delete an event
  async deleteEvent(id: string) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}; 