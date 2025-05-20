import { supabase } from '@/lib/supabase';
import { Task, User } from '@/types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

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
      assignedTo: task.assigned_to.id,
      assignedToName: task.assigned_to.name,
      createdBy: task.created_by.id,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at),
      comments: task.comments || [] // Ensure comments are included
    }));
    
    console.log('Tasks fetched:', tasks);
    return tasks;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

// Alias for fetchTasks to maintain compatibility with existing code
export const fetchAllTasks = fetchTasks;

// Fetch tasks for a specific user - update to include comments
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
      assignedTo: task.assigned_to.id,
      assignedToName: task.assigned_to.name,
      createdBy: task.created_by.id,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at),
      comments: task.comments || [] // Ensure comments are included
    }));
    
    console.log('User tasks fetched:', tasks);
    return tasks;
  } catch (error) {
    console.error(`Error fetching tasks for user ${userId}:`, error);
    throw error;
  }
};

// Alias for fetchUserTasks to maintain compatibility with existing code
export const fetchEmployeeTasks = fetchUserTasks;

// Create a new task
export const createTask = async (
  task: {
    title: string;
    description?: string;
    assignedTo: string;
    status: string;
    progressPercentage?: number;
    createdBy: string;
  }
): Promise<Task> => {
  try {
    console.log('Creating task:', task);
    
    // Set status to "Not Started" if progress is 0
    const status = task.progressPercentage === 0 ? 'Not Started' : task.status;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: task.title,
        description: task.description,
        assigned_to: task.assignedTo,
        status: status,
        created_by: task.createdBy,
        progress_percentage: task.progressPercentage || 0,
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
    if (data.assigned_to.id !== task.createdBy) {
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
      assignedTo: data.assigned_to.id,
      assignedToName: data.assigned_to.name,
      createdBy: data.created_by.id,
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
    
    // Set status based on progress percentage
    if (updates.progressPercentage !== undefined) {
      dbUpdates.progress_percentage = updates.progressPercentage;
      if (updates.progressPercentage === 0) {
        dbUpdates.status = 'Not Started';
      } else if (updates.progressPercentage === 100) {
        dbUpdates.status = 'Complete';
      } else if (updates.status) {
        dbUpdates.status = updates.status;
      }
    } else if (updates.status) {
      dbUpdates.status = updates.status;
    }
    
    if (updates.assignedTo) dbUpdates.assigned_to = updates.assignedTo;
    
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
      assignedTo: data.assigned_to.id,
      assignedToName: data.assigned_to.name,
      createdBy: data.created_by.id,
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

// Alias for updateTask to maintain compatibility with existing code
export const updateTaskProgress = async (
  taskId: string,
  progressPercentage: number,
  currentUserId: string
): Promise<Task> => {
  return updateTask(
    taskId,
    { progressPercentage },
    currentUserId
  );
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

// Add a comment to a task
export const addTaskComment = async (
  taskId: string,
  comment: string,
  userId: string,
  userName: string
): Promise<boolean> => {
  try {
    console.log(`Adding comment to task ${taskId}`);
    
    // Get current comments
    const { data: taskData, error: fetchError } = await supabase
      .from('tasks')
      .select('comments')
      .eq('id', taskId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching task comments:', fetchError);
      throw fetchError;
    }
    
    // Create new comment
    const newComment = {
      id: uuidv4(),
      userId,
      userName,
      text: comment,
      createdAt: new Date().toISOString()
    };
    
    // Add comment to existing comments
    const updatedComments = [...(taskData.comments || []), newComment];
    
    // Update task with new comments
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        comments: updatedComments
      })
      .eq('id', taskId);
    
    if (updateError) {
      console.error('Error updating task comments:', updateError);
      throw updateError;
    }
    
    return true;
  } catch (error) {
    console.error('Error adding comment to task:', error);
    return false;
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

// Send notification to users
export const sendNotification = async (params: {
  userId?: string;
  title: string;
  message: string;
  sendToAll?: boolean;
  adminId: string;
}): Promise<void> => {
  try {
    const { userId, title, message, sendToAll, adminId } = params;
    
    if (sendToAll) {
      // Get all users except the admin
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .neq('id', adminId);
      
      if (userError) {
        throw userError;
      }
      
      // Create notifications for all users
      if (users && users.length > 0) {
        const notifications = users.map(user => ({
          user_id: user.id,
          title,
          message,
          related_to: 'admin',
          related_id: adminId
        }));
        
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);
        
        if (error) {
          throw error;
        }
      }
    } else if (userId) {
      // Create notification for a specific user
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title,
          message,
          related_to: 'admin',
          related_id: adminId
        }]);
      
      if (error) {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
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

// Subscribe to employee task changes
export const subscribeToEmployeeTasks = (userId: string, callback: (tasks: Task[]) => void): () => void => {
  // Initialize with current data
  fetchUserTasks(userId).then(callback).catch(console.error);
  
  // Set up the subscription
  const subscription = supabase
    .channel(`public:tasks:assigned_to=eq.${userId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'tasks', filter: `assigned_to=eq.${userId}` }, 
      () => {
        // When there's any change, fetch the updated list
        fetchUserTasks(userId).then(callback).catch(console.error);
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
};
