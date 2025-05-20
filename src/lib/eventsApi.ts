import { supabase } from '@/lib/supabase';

export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addEvent(event) {
  const { data, error } = await supabase
    .from('events')
    .insert([event])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id, updates) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
} 