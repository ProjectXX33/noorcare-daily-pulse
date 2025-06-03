import { supabase } from './supabase';
import { EmployeeRating, TaskRating, EmployeeRatingRecord, TaskRatingRecord } from '@/types';

// Employee Rating Functions
export const rateEmployee = async (employeeId: string, rating: number, comment?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('employee_ratings')
    .insert({
      employee_id: employeeId,
      rating: rating,
      comment: comment || null,
      rated_by: user.id
    })
    .select(`
      *,
      rated_by_user:users!employee_ratings_rated_by_fkey(name)
    `)
    .single();

  if (error) throw error;
  return mapEmployeeRatingFromRecord(data);
};

export const updateEmployeeRating = async (ratingId: string, rating: number, comment?: string) => {
  const { data, error } = await supabase
    .from('employee_ratings')
    .update({
      rating: rating,
      comment: comment || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', ratingId)
    .select(`
      *,
      rated_by_user:users!employee_ratings_rated_by_fkey(name)
    `)
    .single();

  if (error) throw error;
  return mapEmployeeRatingFromRecord(data);
};

export const getEmployeeRatings = async (employeeId: string): Promise<EmployeeRating[]> => {
  const { data, error } = await supabase
    .from('employee_ratings')
    .select(`
      *,
      rated_by_user:users!employee_ratings_rated_by_fkey(name)
    `)
    .eq('employee_id', employeeId)
    .order('rated_at', { ascending: false });

  if (error) throw error;
  return data.map(mapEmployeeRatingFromRecord);
};

export const getLatestEmployeeRating = async (employeeId: string): Promise<EmployeeRating | null> => {
  const { data, error } = await supabase
    .from('employee_ratings')
    .select(`
      *,
      rated_by_user:users!employee_ratings_rated_by_fkey(name)
    `)
    .eq('employee_id', employeeId)
    .order('rated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No data found
    throw error;
  }
  return mapEmployeeRatingFromRecord(data);
};

export const getEmployeeAverageRating = async (employeeId: string): Promise<number> => {
  const { data, error } = await supabase
    .rpc('get_employee_average_rating', { employee_uuid: employeeId });

  if (error) throw error;
  return Number(data) || 0;
};

export const deleteEmployeeRating = async (ratingId: string) => {
  const { error } = await supabase
    .from('employee_ratings')
    .delete()
    .eq('id', ratingId);

  if (error) throw error;
};

// Task Rating Functions
export const rateTask = async (taskId: string, rating: number, comment?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('task_ratings')
    .insert({
      task_id: taskId,
      rating: rating,
      comment: comment || null,
      rated_by: user.id
    })
    .select(`
      *,
      rated_by_user:users!task_ratings_rated_by_fkey(name)
    `)
    .single();

  if (error) throw error;
  return mapTaskRatingFromRecord(data);
};

export const updateTaskRating = async (ratingId: string, rating: number, comment?: string) => {
  const { data, error } = await supabase
    .from('task_ratings')
    .update({
      rating: rating,
      comment: comment || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', ratingId)
    .select(`
      *,
      rated_by_user:users!task_ratings_rated_by_fkey(name)
    `)
    .single();

  if (error) throw error;
  return mapTaskRatingFromRecord(data);
};

export const getTaskRatings = async (taskId: string): Promise<TaskRating[]> => {
  const { data, error } = await supabase
    .from('task_ratings')
    .select(`
      *,
      rated_by_user:users!task_ratings_rated_by_fkey(name)
    `)
    .eq('task_id', taskId)
    .order('rated_at', { ascending: false });

  if (error) throw error;
  return data.map(mapTaskRatingFromRecord);
};

export const getLatestTaskRating = async (taskId: string): Promise<TaskRating | null> => {
  const { data, error } = await supabase
    .from('task_ratings')
    .select(`
      *,
      rated_by_user:users!task_ratings_rated_by_fkey(name)
    `)
    .eq('task_id', taskId)
    .order('rated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No data found
    throw error;
  }
  return mapTaskRatingFromRecord(data);
};

export const getTaskAverageRating = async (taskId: string): Promise<number> => {
  const { data, error } = await supabase
    .rpc('get_task_average_rating', { task_uuid: taskId });

  if (error) throw error;
  return Number(data) || 0;
};

export const deleteTaskRating = async (ratingId: string) => {
  const { error } = await supabase
    .from('task_ratings')
    .delete()
    .eq('id', ratingId);

  if (error) throw error;
};

// Helper functions to map database records to TypeScript types
const mapEmployeeRatingFromRecord = (record: any): EmployeeRating => ({
  id: record.id,
  employeeId: record.employee_id,
  rating: record.rating,
  comment: record.comment,
  ratedBy: record.rated_by,
  ratedByName: record.rated_by_user?.name,
  ratedAt: new Date(record.rated_at),
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at)
});

const mapTaskRatingFromRecord = (record: any): TaskRating => ({
  id: record.id,
  taskId: record.task_id,
  rating: record.rating,
  comment: record.comment,
  ratedBy: record.rated_by,
  ratedByName: record.rated_by_user?.name,
  ratedAt: new Date(record.rated_at),
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at)
});

// Utility function to get star rating color
export const getStarRatingColor = (rating: number): string => {
  if (rating >= 4) return 'text-yellow-500'; // Gold for 4-5 stars
  if (rating >= 3) return 'text-yellow-400'; // Light gold for 3 stars
  if (rating >= 2) return 'text-orange-400'; // Orange for 2 stars
  return 'text-red-400'; // Red for 1 star
};

// Utility function to get rating badge color
export const getRatingBadgeColor = (rating: number): string => {
  if (rating >= 4) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (rating >= 3) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  if (rating >= 2) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
}; 