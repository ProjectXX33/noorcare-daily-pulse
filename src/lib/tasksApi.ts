
import { supabase } from "@/lib/supabase";
import { Task } from "@/types";

// Fetch all tasks
export async function fetchAllTasks(): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        assigned_to,
        status,
        progress_percentage,
        created_at,
        updated_at,
        created_by,
        users:assigned_to(name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      assignedTo: item.assigned_to,
      assignedToName: item.users?.name || 'Unknown',
      status: item.status as 'On Hold' | 'In Progress' | 'Complete',
      progressPercentage: item.progress_percentage,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      createdBy: item.created_by
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

// Fetch tasks assigned to a specific employee
export async function fetchEmployeeTasks(employeeId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        assigned_to,
        status,
        progress_percentage,
        created_at,
        updated_at,
        created_by,
        users:assigned_to(name)
      `)
      .eq('assigned_to', employeeId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      assignedTo: item.assigned_to,
      assignedToName: item.users?.name || 'Unknown',
      status: item.status as 'On Hold' | 'In Progress' | 'Complete',
      progressPercentage: item.progress_percentage,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      createdBy: item.created_by
    }));
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    throw error;
  }
}

// Create a new task
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
        id,
        title,
        description,
        assigned_to,
        status,
        progress_percentage,
        created_at,
        updated_at,
        created_by,
        users!assigned_to(name)
      `)
      .single();
    
    if (error) throw error;
    
    // Send notification to the assigned user
    try {
      await sendNotification({
        userId: task.assignedTo,
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${task.title}"`,
        adminId: task.createdBy,
        relatedTo: 'task',
        relatedId: data.id
      });
    } catch (notifError) {
      console.error('Error sending task assignment notification:', notifError);
      // Don't throw error as the main task was created successfully
    }
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedToName: data.users?.name || 'Unknown',
      status: data.status as 'On Hold' | 'In Progress' | 'Complete',
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

// Update task progress
export async function updateTaskProgress(
  taskId: string,
  userId: string,
  progressPercentage: number
): Promise<Task> {
  try {
    // Get the current task to determine the status and check if user can update
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        assigned_to,
        status,
        progress_percentage,
        created_at,
        updated_at,
        created_by,
        users:assigned_to(name)
      `)
      .eq('id', taskId)
      .single();
    
    if (taskError) throw taskError;
    
    // Check if the user is either the creator or the assigned user
    if (taskData.assigned_to !== userId && taskData.created_by !== userId) {
      throw new Error('You do not have permission to update this task');
    }
    
    // Determine the status based on the progress percentage
    let status: 'On Hold' | 'In Progress' | 'Complete' = taskData.status as 'On Hold' | 'In Progress' | 'Complete';
    if (progressPercentage === 0) {
      status = 'On Hold';
    } else if (progressPercentage === 100) {
      status = 'Complete';
    } else {
      status = 'In Progress';
    }
    
    // Update the task progress and status
    const { data, error } = await supabase
      .from('tasks')
      .update({
        progress_percentage: progressPercentage,
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select(`
        id,
        title,
        description,
        assigned_to,
        status,
        progress_percentage,
        created_at,
        updated_at,
        created_by,
        users:assigned_to(name)
      `)
      .single();
      
    if (error) throw error;
    
    // If the status changed and the user is the assignee (not admin), notify the creator
    if (userId === taskData.assigned_to && status !== taskData.status) {
      try {
        await sendNotification({
          userId: taskData.created_by,
          title: 'Task Status Updated',
          message: `Task "${taskData.title}" status has been updated to ${status} by ${taskData.users?.name || 'Assigned user'}`,
          adminId: userId, // Using assignee's ID as admin ID here
          relatedTo: 'task',
          relatedId: taskId
        });
      } catch (notifError) {
        console.error('Error sending status update notification:', notifError);
        // Don't throw error as the main update was successful
      }
    }
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedToName: data.users?.name || 'Unknown',
      status: data.status as 'On Hold' | 'In Progress' | 'Complete',
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

// Send a notification to a user
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
        .neq('id', adminId)
        .eq('role', 'employee');
      
      if (usersError) throw usersError;
      
      // Create notification for each user
      const notificationsToInsert = users.map(user => ({
        user_id: user.id,
        title,
        message,
        related_to: relatedTo,
        related_id: relatedId
      }));
      
      const { error } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);
      
      if (error) throw error;
    } else if (userId) {
      // Create notification for a specific user
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          related_to: relatedTo,
          related_id: relatedId
        });
      
      if (error) throw error;
    } else {
      throw new Error('Either userId must be provided or sendToAll must be true');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Subscribe to real-time task changes
export function subscribeToTaskChanges(callback: (tasks: Task[]) => void): () => void {
  // Set up subscription
  const channel = supabase
    .channel('tasks-channel')
    .on('postgres_changes', 
      {
        event: '*', 
        schema: 'public',
        table: 'tasks'
      }, 
      async (payload) => {
        console.log('Task change detected:', payload);
        try {
          // Fetch all tasks again when there's a change
          const tasks = await fetchAllTasks();
          callback(tasks);
        } catch (error) {
          console.error('Error fetching updated tasks:', error);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// Subscribe to real-time task changes for a specific employee
export function subscribeToEmployeeTasks(employeeId: string, callback: (tasks: Task[]) => void): () => void {
  // Set up subscription
  const channel = supabase
    .channel(`tasks-employee-${employeeId}`)
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `assigned_to=eq.${employeeId}`
      },
      async (payload) => {
        console.log('Employee task change detected:', payload);
        try {
          // Fetch employee tasks again when there's a change
          const tasks = await fetchEmployeeTasks(employeeId);
          callback(tasks);
        } catch (error) {
          console.error('Error fetching updated employee tasks:', error);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}
