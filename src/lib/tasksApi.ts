
import { supabase } from '@/lib/supabase';
import { Task, User } from '@/types';
import { toast } from 'sonner';

// Fetch all tasks
export const fetchTasks = async (): Promise<Task[]> => {
  try {
    console.log('Fetching all tasks...');
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_to:users!tasks_assigned_to_fkey (id, name, username, department, position),
        created_by:users!tasks_created_by_fkey (id, name, username, department, position)
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    // Map the data to match our Task interface
    const tasks: Task[] = data.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      progressPercentage: task.progress_percentage,
      assignedTo: {
        id: task.assigned_to.id,
        name: task.assigned_to.name,
        username: task.assigned_to.username,
        department: task.assigned_to.department,
        position: task.assigned_to.position
      },
      createdBy: {
        id: task.created_by.id,
        name: task.created_by.name,
        username: task.created_by.username,
        department: task.created_by.department,
        position: task.created_by.position
      },
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at)
    }));
    
    console.log('Tasks fetched:', tasks);
    return tasks;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

// Fetch tasks for a specific user
export const fetchUserTasks = async (userId: string): Promise<Task[]> => {
  try {
    console.log(`Fetching tasks for user ${userId}...`);
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_to:users!tasks_assigned_to_fkey (id, name, username, department, position),
        created_by:users!tasks_created_by_fkey (id, name, username, department, position)
      `)
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    // Map the data to match our Task interface
    const tasks: Task[] = data.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      progressPercentage: task.progress_percentage,
      assignedTo: {
        id: task.assigned_to.id,
        name: task.assigned_to.name,
        username: task.assigned_to.username,
        department: task.assigned_to.department,
        position: task.assigned_to.position
      },
      createdBy: {
        id: task.created_by.id,
        name: task.created_by.name,
        username: task.created_by.username,
        department: task.created_by.department,
        position: task.created_by.position
      },
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at)
    }));
    
    console.log('User tasks fetched:', tasks);
    return tasks;
  } catch (error) {
    console.error(`Error fetching tasks for user ${userId}:`, error);
    throw error;
  }
};

// Create a new task
export const createTask = async (
  task: {
    title: string;
    description?: string;
    assignedTo: string;
    status: string;
  }, 
  createdBy: string
): Promise<Task> => {
  try {
    console.log('Creating task:', task);
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: task.title,
        description: task.description,
        assigned_to: task.assignedTo,
        status: task.status,
        created_by: createdBy,
        progress_percentage: 0,
      }])
      .select(`
        *,
        assigned_to:users!tasks_assigned_to_fkey (id, name, username, department, position),
        created_by:users!tasks_created_by_fkey (id, name, username, department, position)
      `)
      .single();
    
    if (error) {
      throw error;
    }
    
    // Create task notification for assigned user
    if (data.assigned_to.id !== createdBy) {
      await createTaskNotification(
        data.assigned_to.id, 
        data.id, 
        data.title, 
        'assigned'
      );
    }
    
    // Map the data to match our Task interface
    const newTask: Task = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      progressPercentage: data.progress_percentage,
      assignedTo: {
        id: data.assigned_to.id,
        name: data.assigned_to.name,
        username: data.assigned_to.username,
        department: data.assigned_to.department,
        position: data.assigned_to.position
      },
      createdBy: {
        id: data.created_by.id,
        name: data.created_by.name,
        username: data.created_by.username,
        department: data.created_by.department,
        position: data.created_by.position
      },
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
    
    console.log('Task created:', newTask);
    return newTask;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// Update an existing task
export const updateTask = async (
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    status?: string;
    assignedTo?: string;
    progressPercentage?: number;
  },
  currentUserId: string
): Promise<Task> => {
  try {
    console.log(`Updating task ${taskId}:`, updates);
    
    // Convert the updates to match database column names
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.assignedTo) dbUpdates.assigned_to = updates.assignedTo;
    if (updates.progressPercentage !== undefined) dbUpdates.progress_percentage = updates.progressPercentage;
    
    // Get current task details for notification purposes
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    // Update the task
    const { data, error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId)
      .select(`
        *,
        assigned_to:users!tasks_assigned_to_fkey (id, name, username, department, position),
        created_by:users!tasks_created_by_fkey (id, name, username, department, position)
      `)
      .single();
    
    if (error) {
      throw error;
    }
    
    // Create task notification if assignment changed
    if (updates.assignedTo && currentTask && currentTask.assigned_to !== updates.assignedTo) {
      await createTaskNotification(
        updates.assignedTo, 
        taskId, 
        data.title, 
        'assigned'
      );
    }
    
    // Create status update notification
    if (updates.status && currentTask && currentTask.status !== updates.status) {
      // Notify task creator if status updated by assignee
      if (currentUserId === data.assigned_to.id && data.created_by.id !== currentUserId) {
        await createTaskNotification(
          data.created_by.id, 
          taskId, 
          data.title, 
          'status_update', 
          updates.status
        );
      }
      
      // Notify assignee if status updated by someone else
      if (currentUserId !== data.assigned_to.id) {
        await createTaskNotification(
          data.assigned_to.id, 
          taskId, 
          data.title, 
          'status_update', 
          updates.status
        );
      }
    }
    
    // Map the data to match our Task interface
    const updatedTask: Task = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      progressPercentage: data.progress_percentage,
      assignedTo: {
        id: data.assigned_to.id,
        name: data.assigned_to.name,
        username: data.assigned_to.username,
        department: data.assigned_to.department,
        position: data.assigned_to.position
      },
      createdBy: {
        id: data.created_by.id,
        name: data.created_by.name,
        username: data.created_by.username,
        department: data.created_by.department,
        position: data.created_by.position
      },
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
    
    console.log('Task updated:', updatedTask);
    return updatedTask;
  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error);
    throw error;
  }
};

// Delete a task
export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    console.log(`Deleting task ${taskId}...`);
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) {
      throw error;
    }
    
    console.log(`Task ${taskId} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting task ${taskId}:`, error);
    throw error;
  }
};

// Create a notification for task-related events
const createTaskNotification = async (
  userId: string, 
  taskId: string, 
  taskTitle: string, 
  type: 'assigned' | 'status_update' | 'completed', 
  status?: string
): Promise<void> => {
  try {
    let title = '';
    let message = '';
    
    switch (type) {
      case 'assigned':
        title = 'New Task Assigned';
        message = `You've been assigned a new task: ${taskTitle}`;
        break;
      case 'status_update':
        title = 'Task Status Updated';
        message = `Task "${taskTitle}" status has been updated to ${status}`;
        break;
      case 'completed':
        title = 'Task Completed';
        message = `Task "${taskTitle}" has been marked as complete`;
        break;
    }
    
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        title,
        message,
        related_to: 'task',
        related_id: taskId
      }]);
    
    if (error) {
      console.error('Error creating task notification:', error);
    }
  } catch (error) {
    console.error('Error creating task notification:', error);
  }
};

// Subscribe to task changes
export const subscribeToTaskChanges = (callback: (tasks: Task[]) => void): () => void => {
  // Initialize with current data
  fetchTasks().then(callback).catch(console.error);
  
  // Set up the subscription
  const subscription = supabase
    .channel('public:tasks')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'tasks' }, 
      () => {
        // When there's any change, fetch the updated list
        fetchTasks().then(callback).catch(console.error);
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
};
