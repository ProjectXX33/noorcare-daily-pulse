
import { supabase } from '@/lib/supabase';
import { Task } from '@/types';

// Fetch tasks for admin (all tasks)
export async function fetchAllTasks(): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        users:assigned_to (name)
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      assignedTo: task.assigned_to,
      assignedToName: task.users?.name || 'Unknown',
      status: task.status,
      progressPercentage: task.progress_percentage,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at),
      createdBy: task.created_by
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

// Fetch tasks for a specific employee
export async function fetchEmployeeTasks(employeeId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        users:assigned_to (name)
      `)
      .eq('assigned_to', employeeId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      assignedTo: task.assigned_to,
      assignedToName: task.users?.name || 'Unknown',
      status: task.status,
      progressPercentage: task.progress_percentage,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at),
      createdBy: task.created_by
    }));
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    throw error;
  }
}

// Create a new task (admin only)
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
        users:assigned_to (name)
      `)
      .single();
      
    if (error) throw error;
    
    // Create a notification for the employee
    await supabase.from('notifications').insert({
      user_id: task.assignedTo,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${task.title}`,
      is_read: false,
      related_to: 'task',
      related_id: data.id
    });
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedToName: data.users?.name || 'Unknown',
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

// Update task progress and status (employee can only update their own tasks)
export async function updateTaskProgress(
  taskId: string, 
  employeeId: string, 
  progressPercentage: number
): Promise<Task> {
  try {
    // First, check if the employee is authorized to update this task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('assigned_to', employeeId)
      .single();
      
    if (taskError) throw new Error('Unauthorized or task not found');
    
    // Automatically set status to Complete if progress is 100%
    const status = progressPercentage === 100 ? 'Complete' : taskData.status;
    
    // Update the task
    const { data, error } = await supabase
      .from('tasks')
      .update({ 
        progress_percentage: progressPercentage,
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select(`
        *,
        users:assigned_to (name)
      `)
      .single();
      
    if (error) throw error;
    
    // If task is completed, notify the admin who created it
    if (progressPercentage === 100) {
      await supabase.from('notifications').insert({
        user_id: data.created_by,
        title: 'Task Completed',
        message: `Task "${data.title}" has been completed by ${data.users?.name || 'an employee'}`,
        is_read: false,
        related_to: 'task',
        related_id: data.id
      });
    }
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedToName: data.users?.name || 'Unknown',
      status: data.status,
      progressPercentage: data.progress_percentage,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by
    };
  } catch (error) {
    console.error('Error updating task progress:', error);
    throw error;
  }
}

// Send notification to one or all employees
export async function sendNotification({ 
  userId, 
  title, 
  message,
  sendToAll,
  adminId
}: { 
  userId?: string;
  title: string;
  message: string;
  sendToAll: boolean;
  adminId: string;
}): Promise<void> {
  try {
    if (sendToAll) {
      // Get all employees
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('id')
        .neq('id', adminId); // exclude the admin sending the notification
        
      if (employeesError) throw employeesError;
      
      // Insert notifications for all employees
      const notifications = employees.map(emp => ({
        user_id: emp.id,
        title,
        message,
        is_read: false,
        related_to: 'admin_message'
      }));
      
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);
        
      if (error) throw error;
    } else if (userId) {
      // Insert notification for one employee
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          is_read: false,
          related_to: 'admin_message'
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
