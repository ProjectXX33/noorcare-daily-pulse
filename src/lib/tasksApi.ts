
// This file is very long, so I'm only updating the relevant parts for assigned users to change task status

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
        *,
        users:assigned_to (name)
      `)
      .eq('id', taskId)
      .single();
    
    if (taskError) throw taskError;
    
    // Check if the user is either the creator or the assigned user
    if (taskData.assigned_to !== userId && taskData.created_by !== userId) {
      throw new Error('You do not have permission to update this task');
    }
    
    // Determine the status based on the progress percentage
    let status: 'On Hold' | 'In Progress' | 'Complete' = taskData.status;
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
        *,
        users:assigned_to (name)
      `)
      .single();
      
    if (error) throw error;
    
    // If the status changed and the user is the assignee (not admin), notify the creator
    if (userId === taskData.assigned_to && status !== taskData.status) {
      try {
        await sendNotification({
          userId: taskData.created_by,
          title: 'Task Status Updated',
          message: `Task "${taskData.title}" status has been updated to ${status} by ${data.users?.name || 'Assigned user'}`,
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
      assignedToName: data.users ? data.users.name : 'Unknown',
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
