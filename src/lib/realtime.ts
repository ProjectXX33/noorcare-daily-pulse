
import { supabase } from './supabase';
import { User, CheckIn, WorkReport, Task, Notification } from '@/types';

// Type for callback functions
type DataCallback<T> = (data: T[]) => void;

// Subscribe to real-time changes in the check_ins table
export function subscribeToCheckIns(callback: DataCallback<CheckIn>): () => void {
  const subscription = supabase
    .channel('public:check_ins')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'check_ins' }, 
      (payload) => {
        // When there's a change, fetch all check-ins
        fetchAllCheckIns().then(callback).catch(console.error);
      }
    )
    .subscribe();

  // Fetch initial data
  fetchAllCheckIns().then(callback).catch(console.error);
  
  return () => {
    subscription.unsubscribe();
  };
}

// Subscribe to real-time changes in the tasks table
export function subscribeToTasks(callback: DataCallback<Task>): () => void {
  const subscription = supabase
    .channel('public:tasks')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'tasks' }, 
      (payload) => {
        // When there's a change, fetch all tasks
        fetchAllTasks().then(callback).catch(console.error);
      }
    )
    .subscribe();

  // Fetch initial data
  fetchAllTasks().then(callback).catch(console.error);
  
  return () => {
    subscription.unsubscribe();
  };
}

// Subscribe to real-time changes in the work_reports table
export function subscribeToWorkReports(callback: DataCallback<WorkReport>): () => void {
  const subscription = supabase
    .channel('public:work_reports')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'work_reports' }, 
      (payload) => {
        // When there's a change, fetch all reports
        fetchAllWorkReports().then(callback).catch(console.error);
      }
    )
    .subscribe();

  // Fetch initial data
  fetchAllWorkReports().then(callback).catch(console.error);
  
  return () => {
    subscription.unsubscribe();
  };
}

// Subscribe to real-time changes in the notifications table for a specific user
export function subscribeToUserNotifications(userId: string, callback: DataCallback<Notification>): () => void {
  const subscription = supabase
    .channel(`public:notifications:${userId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}` 
      }, 
      (payload) => {
        // When there's a change, fetch all notifications for this user
        fetchUserNotifications(userId).then(callback).catch(console.error);
      }
    )
    .subscribe();

  // Fetch initial data
  fetchUserNotifications(userId).then(callback).catch(console.error);
  
  return () => {
    subscription.unsubscribe();
  };
}

// Subscribe to all notifications (for admin)
export function subscribeToAllNotifications(callback: DataCallback<Notification>): () => void {
  const subscription = supabase
    .channel('public:notifications:all')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'notifications'
      }, 
      (payload) => {
        // When there's a change, fetch all notifications
        fetchAllNotifications().then(callback).catch(console.error);
      }
    )
    .subscribe();

  // Fetch initial data
  fetchAllNotifications().then(callback).catch(console.error);
  
  return () => {
    subscription.unsubscribe();
  };
}

// Helper functions to fetch data

async function fetchAllCheckIns(): Promise<CheckIn[]> {
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
        *,
        users:user_id (name, department, position)
      `)
      .order('timestamp', { ascending: false });
      
    if (error) throw error;
    
    return data.map((record: any) => ({
      id: record.id,
      userId: record.user_id,
      timestamp: new Date(record.timestamp),
      userName: record.users.name,
      department: record.users.department,
      position: record.users.position,
      checkOutTime: record.checkout_time ? new Date(record.checkout_time) : null
    }));
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    throw error;
  }
}

async function fetchAllTasks(): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:assigned_to (name)
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map((record: any) => ({
      id: record.id,
      title: record.title,
      description: record.description,
      assignedTo: record.assigned_to,
      assignedToName: record.assignee ? record.assignee.name : 'Unknown',
      status: record.status,
      progressPercentage: record.progress_percentage,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      createdBy: record.created_by
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

async function fetchAllWorkReports(): Promise<WorkReport[]> {
  try {
    const { data, error } = await supabase
      .from('work_reports')
      .select(`
        *,
        users:user_id (name, department, position),
        file_attachments (id, file_path, file_name, file_type)
      `)
      .order('date', { ascending: false });
      
    if (error) throw error;
    
    return data.map((record: any) => ({
      id: record.id,
      userId: record.user_id,
      userName: record.users.name,
      date: new Date(record.date),
      tasksDone: record.tasks_done,
      issuesFaced: record.issues_faced || '',
      plansForTomorrow: record.plans_for_tomorrow,
      fileAttachments: record.file_attachments?.map((file: any) => file.file_path) || [],
      department: record.users.department,
      position: record.users.position
    }));
  } catch (error) {
    console.error('Error fetching work reports:', error);
    throw error;
  }
}

async function fetchUserNotifications(userId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map((record: any) => ({
      id: record.id,
      userId: record.user_id,
      title: record.title,
      message: record.message,
      isRead: record.is_read,
      createdAt: new Date(record.created_at),
      relatedTo: record.related_to || undefined,
      relatedId: record.related_id || undefined
    }));
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    throw error;
  }
}

async function fetchAllNotifications(): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map((record: any) => ({
      id: record.id,
      userId: record.user_id,
      title: record.title,
      message: record.message,
      isRead: record.is_read,
      createdAt: new Date(record.created_at),
      relatedTo: record.related_to || undefined,
      relatedId: record.related_id || undefined
    }));
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    throw error;
  }
}
