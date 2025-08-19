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
  qa?: EventQA[];
  status: 'active' | 'paused' | 'finished';
}

export interface EventQA {
  id: string;
  event_id: string;
  question: string;
  answer: string | null;
  order_index: number;
  is_active: boolean;
  created_by: string;
  answered_by: string | null;
  created_at: string;
  updated_at: string;
  answered_at: string | null;
  creator_name?: string;
  creator_email?: string;
  answerer_name?: string;
  answerer_email?: string;
}

export interface CreateEventQAData {
  event_id: string;
  question: string;
  answer?: string;
  order_index?: number;
}

export interface UpdateEventQAData {
  question?: string;
  answer?: string;
  order_index?: number;
  is_active?: boolean;
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
  async getEvents(includeQA: boolean = false) {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, start_date, end_date, created_by, created_at, status')
      .order('start_date', { ascending: true });

    if (error) throw error;
    
    // Map database columns to frontend expectations
    const events = data.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.start_date,
      end: event.end_date,
      created_by: event.created_by,
      created_at: event.created_at,
      status: (event.status as any) || 'active'
    })) as Event[];

    // If Q&A is requested, fetch Q&A for all events
    if (includeQA) {
      console.log('🔍 Fetching Q&A for', events.length, 'events...');
      for (const event of events) {
        try {
          event.qa = await this.getEventQA(event.id);
          console.log(`📝 Event "${event.title}" (${event.id}): ${event.qa?.length || 0} Q&A items`);
        } catch (error) {
          console.error(`Error fetching Q&A for event ${event.id}:`, error);
          event.qa = [];
        }
      }
    }

    return events;
  },

  // Get single event with Q&A
  async getEvent(id: string, includeQA: boolean = true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, start_date, end_date, created_by, created_at, status')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    const event = {
      id: data.id,
      title: data.title,
      description: data.description,
      start: data.start_date,
      end: data.end_date,
      created_by: data.created_by,
      created_at: data.created_at,
      status: (data.status as any) || 'active'
    } as Event;

    if (includeQA) {
      event.qa = await this.getEventQA(id);
    }

    return event;
  },

  // Create a new event
  async createEvent(event: { 
    title: string; 
    description: string | null; 
    start: string; 
    end: string | null; 
    status: 'active' | 'paused' | 'finished';
    created_by: string | null;
  }) {
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title: event.title,
        description: event.description,
        start_date: event.start,
        end_date: event.end,
        created_by: event.created_by,
        status: (event.status as any) || 'active'
      }])
      .select('id, title, description, start_date, end_date, created_by, created_at, status')
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
      created_at: data.created_at,
      status: (data.status as any) || 'active'
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
    if (event.status !== undefined) updateData.status = event.status;

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select('id, title, description, start_date, end_date, created_by, created_at, status')
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
      created_at: data.created_at,
      status: (data.status as any) || 'active'
    } as Event;
  },

  // Delete an event
  async deleteEvent(id: string) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // =====================================================
  // Q&A FUNCTIONALITY
  // =====================================================

  // Get Q&A for a specific event
  async getEventQA(eventId: string): Promise<EventQA[]> {
    console.log(`🔍 Fetching Q&A for event ${eventId}...`);
    
    const { data, error } = await supabase
      .from('event_qa_with_users')
      .select(`
        id,
        event_id,
        question,
        answer,
        order_index,
        is_active,
        created_by,
        answered_by,
        created_at,
        updated_at,
        answered_at,
        creator_name,
        creator_email,
        answerer_name,
        answerer_email
      `)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('order_index')
      .order('created_at');

    if (error) {
      console.error(`❌ Error fetching Q&A for event ${eventId}:`, error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} Q&A items for event ${eventId}`);
    return data as EventQA[];
  },

  // Create a new question for an event
  async createEventQA(qaData: CreateEventQAData): Promise<EventQA> {
    // Get the next order index
    const { data: existingQA } = await supabase
      .from('event_qa')
      .select('order_index')
      .eq('event_id', qaData.event_id)
      .eq('is_active', true)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = qaData.order_index ?? ((existingQA?.[0]?.order_index ?? 0) + 1);

    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    const insertData: any = {
      event_id: qaData.event_id,
      question: qaData.question,
      order_index: nextOrderIndex,
      created_by: userId
    };
    
    // If answer is provided, add it and set answered_by
    if (qaData.answer?.trim()) {
      insertData.answer = qaData.answer.trim();
      insertData.answered_by = userId;
      insertData.answered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('event_qa')
      .insert([insertData])
      .select(`
        id,
        event_id,
        question,
        answer,
        order_index,
        is_active,
        created_by,
        answered_by,
        created_at,
        updated_at,
        answered_at
      `)
      .single();

    if (error) throw error;

    // Get the full Q&A with user information
    const { data: fullQA, error: fullQAError } = await supabase
      .from('event_qa_with_users')
      .select('*')
      .eq('id', data.id)
      .single();

    if (fullQAError) throw fullQAError;

    // Create notification for event creator and admins
    try {
      const { data: eventData } = await supabase
        .from('events')
        .select('title, created_by')
        .eq('id', qaData.event_id)
        .single();

      if (eventData) {
        // Notify event creator
        if (eventData.created_by) {
          await createNotification({
            user_id: eventData.created_by,
            title: 'New Question Added',
            message: `Someone asked a question about your event "${eventData.title}"`,
            related_to: 'event',
            related_id: qaData.event_id,
            created_by: data.created_by
          });
        }

        // Notify all admins
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin');

        if (admins) {
          for (const admin of admins) {
            if (admin.id !== data.created_by && admin.id !== eventData.created_by) {
              await createNotification({
                user_id: admin.id,
                title: 'New Event Question',
                message: `A new question was added to event "${eventData.title}"`,
                related_to: 'event',
                related_id: qaData.event_id,
                created_by: data.created_by
              });
            }
          }
        }
      }
    } catch (notificationError) {
      console.error('Error creating Q&A notifications:', notificationError);
    }

    return fullQA as EventQA;
  },

  // Update Q&A (answer a question or edit)
  async updateEventQA(id: string, updates: UpdateEventQAData): Promise<EventQA> {
    const { data, error } = await supabase
      .from('event_qa')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        event_id,
        question,
        answer,
        order_index,
        is_active,
        created_by,
        answered_by,
        created_at,
        updated_at,
        answered_at
      `)
      .single();

    if (error) throw error;

    // Get the full Q&A with user information
    const { data: fullQA, error: fullQAError } = await supabase
      .from('event_qa_with_users')
      .select('*')
      .eq('id', id)
      .single();

    if (fullQAError) throw fullQAError;

    // If this is answering a question, create notification
    if (updates.answer && !data.answer) {
      try {
        const { data: eventData } = await supabase
          .from('events')
          .select('title')
          .eq('id', data.event_id)
          .single();

        if (eventData && data.created_by) {
          await createNotification({
            user_id: data.created_by,
            title: 'Question Answered',
            message: `Your question about "${eventData.title}" has been answered`,
            related_to: 'event',
            related_id: data.event_id,
            created_by: data.answered_by || undefined
          });
        }
      } catch (notificationError) {
        console.error('Error creating answer notification:', notificationError);
      }
    }

    return fullQA as EventQA;
  },

  // Delete Q&A (soft delete)
  async deleteEventQA(id: string): Promise<void> {
    if (!id) {
      throw new Error('Question ID is required for deletion');
    }

    console.log('🗑️ Attempting to delete Q&A with ID:', id);

    try {
      // Get current user
      const { data: currentUser, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser.user) {
        throw new Error('You must be logged in to delete questions');
      }

      console.log('🔍 Current user ID:', currentUser.user.id);

      // First try a simple soft delete - let RLS handle permissions
      const { data, error } = await supabase
        .from('event_qa')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('is_active', true) // Only update if currently active
        .select('id, is_active');

      if (error) {
        console.error('❌ Soft delete failed, error details:', error);
        
        // If RLS failed, provide more specific error
        if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
          throw new Error('You do not have permission to delete this question');
        }
        
        if (error.code === 'PGRST102') {
          throw new Error('Question not found or already deleted');
        }
        
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        // Question might not exist or already deleted
        console.log('⚠️ No rows affected - checking if question exists');
        
        const { data: checkQA, error: checkError } = await supabase
      .from('event_qa')
          .select('id, is_active, created_by')
          .eq('id', id)
          .single();

        if (checkError || !checkQA) {
          throw new Error('Question not found');
        }

        if (!checkQA.is_active) {
          throw new Error('Question has already been deleted');
        }

        throw new Error('Unable to delete question - please check your permissions');
      }

      console.log('✅ Q&A deleted successfully:', data[0].id);
      
    } catch (error) {
      console.error('❌ Delete operation failed:', error);
      
      // Re-throw with a cleaner message if it's already an Error object
      if (error instanceof Error) {
        throw error;
      }
      
      // Handle unexpected error types
      throw new Error(`Unexpected error during deletion: ${String(error)}`);
    }
  },

  // Reorder Q&A items
  async reorderEventQA(eventId: string, qaIds: string[]): Promise<void> {
    const updates = qaIds.map((id, index) => ({
      id,
      order_index: index + 1
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('event_qa')
        .update({ order_index: update.order_index })
        .eq('id', update.id)
        .eq('event_id', eventId);

      if (error) throw error;
    }
  }
}; 