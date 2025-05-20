import { supabase } from '@/lib/supabase';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string | null;
  created_by: string | null;
  created_at: string;
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