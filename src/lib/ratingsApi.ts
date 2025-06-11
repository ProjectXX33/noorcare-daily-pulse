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
  try {
    console.log('⭐ Starting task rating submission:', {
      taskId,
      rating,
      comment: comment?.substring(0, 50) + (comment && comment.length > 50 ? '...' : ''),
      hasComment: !!comment
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ Authentication error:', authError);
      throw new Error('Authentication failed: ' + authError.message);
    }
    
    if (!user) {
      console.error('❌ No authenticated user found');
      throw new Error('Not authenticated');
    }

    console.log('👤 Authenticated user:', { id: user.id, email: user.email });

    // Validate inputs
    if (!taskId || typeof taskId !== 'string') {
      console.error('❌ Invalid taskId:', taskId);
      throw new Error('Invalid task ID');
    }

    if (!rating || rating < 1 || rating > 5) {
      console.error('❌ Invalid rating:', rating);
      throw new Error('Rating must be between 1 and 5');
    }

    const insertData = {
      task_id: taskId,
      rating: rating,
      comment: comment || null,
      rated_by: user.id
    };

    console.log('📤 Inserting rating data:', insertData);

    const { data, error } = await supabase
      .from('task_ratings')
      .insert(insertData)
      .select(`
        *,
        rated_by_user:users!task_ratings_rated_by_fkey(name)
      `)
      .single();

    if (error) {
      console.error('❌ Supabase error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Provide more specific error messages based on error type
      if (error.code === '23503') {
        throw new Error('Invalid task ID or user ID - foreign key constraint failed');
      } else if (error.code === '23505') {
        throw new Error('You have already rated this task');
      } else if (error.message.includes('violates')) {
        throw new Error('Database constraint violation: ' + error.message);
      } else {
        throw new Error('Failed to submit rating: ' + error.message);
      }
    }

    if (!data) {
      console.error('❌ No data returned from insert operation');
      throw new Error('No data returned from rating submission');
    }

    console.log('✅ Rating submitted successfully:', {
      id: data.id,
      taskId: data.task_id,
      rating: data.rating,
      ratedBy: data.rated_by_user?.name
    });

    return mapTaskRatingFromRecord(data);
  } catch (error) {
    console.error('❌ Complete error in rateTask:', error);
    throw error;
  }
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