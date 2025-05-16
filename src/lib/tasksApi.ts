
import { supabase } from '@/lib/supabase';
import { Task, Notification } from '@/types';

export async function fetchAllTasks(): Promise<Task[]> {
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

export async function fetchUserTasks(userId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map((record: any) => ({
      id: record.id,
      title: record.title,
      description: record.description,
      assignedTo: record.assigned_to,
      assignedToName: '', // Will be filled by the component
      status: record.status,
      progressPercentage: record.progress_percentage,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      createdBy: record.created_by
    }));
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    throw error;
  }
}

export async function createTask(task: {
  title: string;
  description: string;
  assignedTo: string;
  status: 'On Hold' | 'In Progress' | 'Complete';
  progressPercentage: number;
  createdBy: string;
}): Promise<Task> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: task.title,
        description: task.description,
        assigned_to: task.assignedTo,
        status: task.status,
        progress_percentage: task.progressPercentage,
        created_by: task.createdBy
      })
      .select(`
        *,
        assignee:assigned_to (name)
      `)
      .single();
      
    if (error) throw error;
    
    // Create a notification for the assigned user
    await sendNotification({
      userId: task.assignedTo,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${task.title}`,
      adminId: task.createdBy,
      relatedTo: 'task',
      relatedId: data.id
    });
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedToName: data.assignee ? data.assignee.name : 'Unknown',
      status: data.status,
      progressPercentage: data.progress_percentage,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by
    };
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

export async function updateTaskStatus(
  taskId: string, 
  status: 'On Hold' | 'In Progress' | 'Complete',
  progressPercentage: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        status,
        progress_percentage: progressPercentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);
      
    if (error) throw error;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

export async function sendNotification({
  userId,
  title,
  message,
  adminId,
  sendToAll = false,
  relatedTo,
  relatedId
}: {
  userId?: string;
  title: string;
  message: string;
  adminId: string;
  sendToAll?: boolean;
  relatedTo?: string;
  relatedId?: string;
}): Promise<void> {
  try {
    if (sendToAll) {
      // Get all users except the admin
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .neq('id', adminId);
        
      if (usersError) throw usersError;
      
      // Create notifications for all users
      const notifications = users.map(user => ({
        user_id: user.id,
        title,
        message,
        is_read: false,
        related_to: relatedTo,
        related_id: relatedId
      }));
      
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);
        
      if (error) throw error;
    } else if (userId) {
      // Create a notification for a specific user
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          is_read: false,
          related_to: relatedTo,
          related_id: relatedId
        });
        
      if (error) throw error;
    } else {
      throw new Error('Either userId or sendToAll must be provided');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
      
    if (error) throw error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function fetchUserNotifications(userId: string): Promise<Notification[]> {
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

// Fixed function for downloading file attachments
export async function downloadFileAttachment(filePath: string): Promise<{
  url: string;
  fileName: string;
  fileType: string;
}> {
  try {
    // First get the file details from the database
    const { data: fileData, error: fileError } = await supabase
      .from('file_attachments')
      .select('file_name, file_type')
      .eq('file_path', filePath)
      .single();
      
    if (fileError) {
      console.error('Error fetching file details:', fileError);
      throw fileError;
    }
    
    // Then get the actual file from storage
    const { data, error } = await supabase.storage
      .from('attachments') // Make sure this matches your bucket name
      .download(filePath);
      
    if (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
    
    // Create a blob URL for the file
    const blob = new Blob([data], { type: fileData.file_type });
    const url = URL.createObjectURL(blob);
    
    return {
      url,
      fileName: fileData.file_name,
      fileType: fileData.file_type
    };
  } catch (error) {
    console.error('Error downloading attachment:', error);
    throw error;
  }
}
