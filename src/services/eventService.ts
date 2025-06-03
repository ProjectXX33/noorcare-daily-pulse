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
        related_id: event.id,
        created_by: event.created_by || undefined
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
      .select('id, title, description, start_date, end_date, created_by, created_at')
      .order('start_date', { ascending: true });

    if (error) throw error;
    
    // Map database columns to frontend expectations
    return data.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.start_date,
      end: event.end_date,
      created_by: event.created_by,
      created_at: event.created_at
    })) as Event[];
  },

  // Create a new event
  async createEvent(event: Omit<Event, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title: event.title,
        description: event.description,
        start_date: event.start,
        end_date: event.end,
        created_by: event.created_by
      }])
      .select('id, title, description, start_date, end_date, created_by, created_at')
      .single();

    if (error) throw error;

    // Map database response to frontend format
    const mappedEvent = {
      id: data.id,
      title: data.title,
      description: data.description,
      start: data.start_date,
      end: data.end_date,
      created_by: data.created_by,
      created_at: data.created_at
    } as Event;

    // Create notifications for all users
    await createEventNotifications(mappedEvent);

    return mappedEvent;
  },

  // Update an existing event
  async updateEvent(id: string, event: Partial<Event>) {
    const updateData: any = {};
    if (event.title !== undefined) updateData.title = event.title;
    if (event.description !== undefined) updateData.description = event.description;
    if (event.start !== undefined) updateData.start_date = event.start;
    if (event.end !== undefined) updateData.end_date = event.end;
    if (event.created_by !== undefined) updateData.created_by = event.created_by;

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select('id, title, description, start_date, end_date, created_by, created_at')
      .single();

    if (error) throw error;
    
    // Map database response to frontend format
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      start: data.start_date,
      end: data.end_date,
      created_by: data.created_by,
      created_at: data.created_at
    } as Event;
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