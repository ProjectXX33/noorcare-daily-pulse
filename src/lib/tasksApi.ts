import { supabase } from '@/lib/supabase';
import { Task, User } from '@/types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { createNotification } from '@/lib/notifications';
import { 
  getUserLanguage, 
  createTaskAssignmentNotification,
  createTaskStatusNotification,
  createTaskCompletionNotification,
  createCommentNotification,
  createTaskUpdateNotification
} from '@/lib/multilingualNotifications';

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
      priority: task.priority || 'medium',
      projectType: task.project_type || 'other',
      assignedTo: task.assigned_to.id,
      assignedToName: task.assigned_to.name,
      assignedToPosition: task.assigned_to.position,
      createdBy: task.created_by.id,
      createdByName: task.created_by.name,
      createdByPosition: task.created_by.position,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at),
      comments: task.comments || [], // Ensure comments are included
      // Add new designer fields
      tacticalPlan: task.tactical_plan,
      timeEstimate: task.time_estimate,
      aim: task.aim,
      idea: task.idea,
      copy: task.copy,
      visualFeeding: task.visual_feeding,
      attachmentFile: task.attachment_file,
      notes: task.notes
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
      priority: task.priority || 'medium',
      projectType: task.project_type || 'other',
      assignedTo: task.assigned_to.id,
      assignedToName: task.assigned_to.name,
      assignedToPosition: task.assigned_to.position,
      createdBy: task.created_by.id,
      createdByName: task.created_by.name,
      createdByPosition: task.created_by.position,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at),
      comments: task.comments || [], // Ensure comments are included
      // Add new designer fields
      tacticalPlan: task.tactical_plan,
      timeEstimate: task.time_estimate,
      aim: task.aim,
      idea: task.idea,
      copy: task.copy,
      visualFeeding: task.visual_feeding,
      attachmentFile: task.attachment_file,
      notes: task.notes
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
    priority?: string;
    projectType?: string;
    // New designer fields
    tacticalPlan?: string;
    timeEstimate?: string;
    aim?: string;
    idea?: string;
    copy?: string;
    visualFeeding?: string;
    attachmentFile?: string;
    notes?: string;
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
        priority: task.priority || 'medium',
        project_type: task.projectType || 'other',
        // Add new designer fields
        tactical_plan: task.tacticalPlan,
        time_estimate: task.timeEstimate,
        aim: task.aim,
        idea: task.idea,
        copy: task.copy,
        visual_feeding: task.visualFeeding,
        attachment_file: task.attachmentFile,
        notes: task.notes,
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
      const userLanguage = getUserLanguage(data.assigned_to.id);
      const notification = createTaskAssignmentNotification(data.title, userLanguage);
      
      await createNotification({
        user_id: data.assigned_to.id,
        title: notification.title,
        message: notification.message,
        related_to: 'task',
        related_id: data.id,
        created_by: data.created_by.id
      });
    }
    
    // Map the data to match our Task interface
    const newTask: Task = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      progressPercentage: data.progress_percentage,
      priority: data.priority || 'medium',
      projectType: data.project_type || 'other',
      assignedTo: data.assigned_to.id,
      assignedToName: data.assigned_to.name,
      assignedToPosition: data.assigned_to.position,
      createdBy: data.created_by.id,
      createdByName: data.created_by.name,
      createdByPosition: data.created_by.position,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      // Add new designer fields
      tacticalPlan: data.tactical_plan,
      timeEstimate: data.time_estimate,
      aim: data.aim,
      idea: data.idea,
      copy: data.copy,
      visualFeeding: data.visual_feeding,
      attachmentFile: data.attachment_file,
      notes: data.notes
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
    priority?: string;
    projectType?: string;
    // New designer fields
    tacticalPlan?: string;
    timeEstimate?: string;
    aim?: string;
    idea?: string;
    copy?: string;
    visualFeeding?: string;
    attachmentFile?: string;
    notes?: string;
  },
  currentUserId: string
): Promise<Task> => {
  try {
    console.log(`Updating task ${taskId}:`, updates);
    
    // Convert the updates to match database column names
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.projectType) dbUpdates.project_type = updates.projectType;
    // Add new designer fields
    if (updates.tacticalPlan !== undefined) dbUpdates.tactical_plan = updates.tacticalPlan;
    if (updates.timeEstimate !== undefined) dbUpdates.time_estimate = updates.timeEstimate;
    if (updates.aim !== undefined) dbUpdates.aim = updates.aim;
    if (updates.idea !== undefined) dbUpdates.idea = updates.idea;
    if (updates.copy !== undefined) dbUpdates.copy = updates.copy;
    if (updates.visualFeeding !== undefined) dbUpdates.visual_feeding = updates.visualFeeding;
    if (updates.attachmentFile !== undefined) dbUpdates.attachment_file = updates.attachmentFile;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    
    // Always set status based on progress percentage
    if (updates.progressPercentage !== undefined) {
      dbUpdates.progress_percentage = updates.progressPercentage;
      if (updates.progressPercentage === 0) {
        dbUpdates.status = 'Not Started';
      } else if (updates.progressPercentage === 100) {
        dbUpdates.status = 'Complete';
      } else {
        dbUpdates.status = 'In Progress';
      }
    }
    if (updates.assignedTo) dbUpdates.assigned_to = updates.assignedTo;
    
    // Get current task details for notification purposes
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    // Add explicit updated_at timestamp
    dbUpdates.updated_at = new Date().toISOString();
    
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
      const userLanguage = getUserLanguage(updates.assignedTo);
      const notification = createTaskAssignmentNotification(data.title, userLanguage);
      
      await createNotification({
        user_id: updates.assignedTo,
        title: notification.title,
        message: notification.message,
        related_to: 'task',
        related_id: taskId,
        created_by: data.created_by.id
      });
    }
    
    // Create status update notification
    if (updates.progressPercentage !== undefined && currentTask && currentTask.progress_percentage !== updates.progressPercentage) {
      // Notify assignee if status updated by someone else (not admin)
      if (currentUserId !== data.assigned_to.id && data.assigned_to.id !== data.created_by.id) {
        const userLanguage = getUserLanguage(data.assigned_to.id);
        const notification = createTaskStatusNotification(
          data.title, 
          dbUpdates.status || data.status, 
          userLanguage
        );
        
        await createNotification({
          user_id: data.assigned_to.id,
          title: notification.title,
          message: notification.message,
          related_to: 'task',
          related_id: taskId,
          created_by: data.created_by.id
        });
      }
      // Do NOT send status update notification to admins (only send generic 'Task Updated' below)
    }

    // Send notification to all admins about the update
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
    if (adminError) {
      console.error('Error fetching admins for notification:', adminError);
    } else if (admins && admins.length > 0) {
      for (const admin of admins) {
        if (admin.id !== currentUserId) { // Exclude the admin who made the update
          const userLanguage = getUserLanguage(admin.id);
          const notification = createTaskUpdateNotification(
            data.title,
            dbUpdates.status || data.status,
            dbUpdates.progress_percentage ?? data.progress_percentage,
            userLanguage
          );
          
          await createNotification({
            user_id: admin.id,
            title: notification.title,
            message: notification.message,
            related_to: 'task',
            related_id: taskId,
            created_by: data.created_by.id
          });
        }
      }
    }
    
    // Map the data to match our Task interface
    const updatedTask: Task = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      progressPercentage: data.progress_percentage,
      priority: data.priority || 'medium',
      projectType: data.project_type || 'other',
      assignedTo: data.assigned_to.id,
      assignedToName: data.assigned_to.name,
      assignedToPosition: data.assigned_to.position,
      createdBy: data.created_by.id,
      createdByName: data.created_by.name,
      createdByPosition: data.created_by.position,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      // Add new designer fields
      tacticalPlan: data.tactical_plan,
      timeEstimate: data.time_estimate,
      aim: data.aim,
      idea: data.idea,
      copy: data.copy,
      visualFeeding: data.visual_feeding,
      attachmentFile: data.attachment_file,
      notes: data.notes
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
    
    // Get current comments and task details including creator info
    const { data: taskData, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        *,
        creator:created_by(id, position),
        assignee:assigned_to(id, position)
      `)
      .eq('id', taskId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching task comments:', fetchError);
      throw fetchError;
    }
    
    console.log('📝 Task data for notification:', {
      taskId,
      commentUserId: userId,
      taskCreatedBy: taskData.created_by,
      taskAssignedTo: taskData.assigned_to,
      creatorPosition: taskData.creator?.position,
      assigneePosition: taskData.assignee?.position
    });
    
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

    // Enhanced notification logic for different roles including admin comments
    if (taskData.assigned_to) {
      // Get the commenter's role information
      const { data: commenterData, error: commenterError } = await supabase
        .from('users')
        .select('role, position')
        .eq('id', userId)
        .single();
      
      if (commenterError) {
        console.error('Error fetching commenter data:', commenterError);
      }
      
      const commenterRole = commenterData?.role;
      const commenterPosition = commenterData?.position;
      const creatorPosition = taskData.creator?.position;
      const assigneePosition = taskData.assignee?.position;
      
      console.log('🔔 Comment notification data:', {
        commenterId: userId,
        commenterRole,
        commenterPosition,
        taskCreatedBy: taskData.created_by,
        taskAssignedTo: taskData.assigned_to,
        creatorPosition,
        assigneePosition
      });
      
      // Case 1: Admin commented on any task - notify the assigned employee
      if (commenterRole === 'admin' && userId !== taskData.assigned_to) {
        console.log('🔔 Admin commented, notifying assigned employee');
        const userLanguage = getUserLanguage(taskData.assigned_to);
        const notification = createCommentNotification(
          userName,
          comment,
          taskData.title,
          commenterRole,
          commenterPosition,
          userLanguage
        );
        
        console.log('📤 Sending admin comment notification to assignee:', {
          title: notification.title,
          recipientId: taskData.assigned_to,
          message: notification.message.substring(0, 100) + '...'
        });
        
        await createNotification({
          user_id: taskData.assigned_to,
          title: notification.title,
          message: notification.message,
          related_to: 'task',
          related_id: taskId,
          created_by: userId
        });
        
        console.log('✅ Admin comment notification sent to assignee successfully');
      }
      // Case 2: Task creator (Admin/Media Buyer) commented, notify assigned employee
      else if (userId === taskData.created_by && userId !== taskData.assigned_to) {
        console.log('🔔 Creator commented, notifying assignee');
        const userLanguage = getUserLanguage(taskData.assigned_to);
        const notification = createCommentNotification(
          userName,
          comment,
          taskData.title,
          commenterRole,
          commenterPosition,
          userLanguage
        );
        
        console.log('📤 Sending notification to assignee:', {
          title: notification.title,
          recipientId: taskData.assigned_to,
          message: notification.message.substring(0, 100) + '...'
        });
        
        await createNotification({
          user_id: taskData.assigned_to,
          title: notification.title,
          message: notification.message,
          related_to: 'task',
          related_id: taskId,
          created_by: userId
        });
        
        console.log('✅ Notification sent to assignee successfully');
      }
      // Case 3: Assigned employee commented, notify task creator (and admin if different)
      else if (userId === taskData.assigned_to && taskData.created_by) {
        console.log('🔔 Assignee commented, notifying creator');
        const userLanguage = getUserLanguage(taskData.created_by);
        const notification = createCommentNotification(
          userName,
          comment,
          taskData.title,
          commenterRole,
          commenterPosition,
          userLanguage
        );
        
        console.log('📤 Sending notification to creator:', {
          title: notification.title,
          recipientId: taskData.created_by,
          message: notification.message.substring(0, 100) + '...'
        });
        
        await createNotification({
          user_id: taskData.created_by,
          title: notification.title,
          message: notification.message,
          related_to: 'task',
          related_id: taskId,
          created_by: userId
        });
        
        console.log('✅ Notification sent to creator successfully');
      }
      // Case 4: Someone else (e.g., another admin, other employee) commented - notify assigned employee
      else if (userId !== taskData.assigned_to && userId !== taskData.created_by) {
        console.log('🔔 Other user commented, notifying assigned employee');
        const userLanguage = getUserLanguage(taskData.assigned_to);
        const notification = createCommentNotification(
          userName,
          comment,
          taskData.title,
          commenterRole,
          commenterPosition,
          userLanguage
        );
        
        console.log('📤 Sending notification to assigned employee:', {
          title: notification.title,
          recipientId: taskData.assigned_to,
          message: notification.message.substring(0, 100) + '...'
        });
        
        await createNotification({
          user_id: taskData.assigned_to,
          title: notification.title,
          message: notification.message,
          related_to: 'task',
          related_id: taskId,
          created_by: userId
        });
        
        console.log('✅ Notification sent to assigned employee successfully');
      } else {
        console.log('ℹ️ No additional notification needed (commenting on own task)');
      }
    } else {
      console.log('⚠️ Missing task assignee data - no notification sent');
    }
    
    console.log('✅ Comment added successfully');
    return true;
  } catch (error) {
    console.error('Error adding comment to task:', error);
    return false;
  }
};

// Create a notification for task-related events (DEPRECATED - use multilingual functions instead)
const createTaskNotification = async (
  userId: string, 
  taskId: string, 
  taskTitle: string, 
  type: 'assigned' | 'status_update' | 'completed', 
  status?: string,
  createdBy?: string
): Promise<void> => {
  try {
    const userLanguage = getUserLanguage(userId);
    let notification: { title: string; message: string };
    
    switch (type) {
      case 'assigned':
        notification = createTaskAssignmentNotification(taskTitle, userLanguage);
        break;
      case 'status_update':
        notification = createTaskStatusNotification(taskTitle, status || 'Unknown', userLanguage);
        break;
      case 'completed':
        notification = createTaskCompletionNotification(taskTitle, userLanguage);
        break;
    }
    
    // Get current user as fallback for created_by
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    await createNotification({
      user_id: userId,
      title: notification.title,
      message: notification.message,
      related_to: 'task',
      related_id: taskId,
      created_by: createdBy || currentUser?.id
    });
  } catch (error) {
    console.error('Error creating task notification:', error);
  }
};

// Send notification to users (supports multilingual notifications)
export const sendNotification = async (params: {
  userId?: string;
  title: string;
  message: string;
  sendToAll?: boolean;
  adminId: string;
}): Promise<void> => {
  try {
    const { userId, title, message, sendToAll, adminId } = params;
    
    console.log('Sending notification with params:', params);
    
    if (sendToAll) {
      // Get all users except the admin
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .neq('id', adminId);
      
      if (userError) {
        console.error('Error fetching users for broadcast:', userError);
        throw userError;
      }
      
      // Create notifications for all users (currently using same title/message for all)
      // TODO: In future, could translate based on each user's language preference
      if (users && users.length > 0) {
        for (const user of users) {
          await createNotification({
            user_id: user.id,
            title,
            message,
            related_to: 'admin',
            related_id: adminId,
            created_by: adminId
          });
        }
        console.log(`Notification sent to ${users.length} users`);
      }
    } else if (userId) {
      // Create notification for a specific user
      await createNotification({
        user_id: userId,
        title,
        message,
        related_to: 'admin',
        related_id: adminId,
        created_by: adminId
      });
      console.log(`Notification sent to user ${userId}`);
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
