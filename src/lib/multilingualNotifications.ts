import { supabase } from '@/lib/supabase';

interface NotificationTranslations {
  en: {
    newTaskAssigned: string;
    taskStatusUpdated: string;
    taskCompleted: string;
    taskUpdated: string;
    adminCommentOnTask: string;
    newCommentOnTask: string;
    mediaBuyerComment: string;
    designerUpdate: string;
    newCommentOnYourTask: string;
    youveBeenAssignedTask: string;
    taskStatusUpdatedTo: string;
    taskMarkedComplete: string;
    adminCommentedOnTask: string;
    commentedOnYourTask: string;
    mediaBuyerCommentedOnTask: string;
    designerCommentedOnTask: string;
    commentedOnAssignedTask: string;
    on: string;
  };
  ar: {
    newTaskAssigned: string;
    taskStatusUpdated: string;
    taskCompleted: string;
    taskUpdated: string;
    adminCommentOnTask: string;
    newCommentOnTask: string;
    mediaBuyerComment: string;
    designerUpdate: string;
    newCommentOnYourTask: string;
    youveBeenAssignedTask: string;
    taskStatusUpdatedTo: string;
    taskMarkedComplete: string;
    adminCommentedOnTask: string;
    commentedOnYourTask: string;
    mediaBuyerCommentedOnTask: string;
    designerCommentedOnTask: string;
    commentedOnAssignedTask: string;
    on: string;
  };
}

const translations: NotificationTranslations = {
  en: {
    newTaskAssigned: "New Task Assigned",
    taskStatusUpdated: "Task Status Updated",
    taskCompleted: "Task Completed",
    taskUpdated: "Task Updated",
    adminCommentOnTask: "Admin Comment on Your Task",
    newCommentOnTask: "New Comment on Task",
    mediaBuyerComment: "Media Buyer Comment",
    designerUpdate: "Designer Update",
    newCommentOnYourTask: "New Comment on Your Task",
    youveBeenAssignedTask: "You've been assigned a new task:",
    taskStatusUpdatedTo: "status has been updated to",
    taskMarkedComplete: "has been marked as complete",
    adminCommentedOnTask: "commented on your task:",
    commentedOnYourTask: "commented on your task:",
    mediaBuyerCommentedOnTask: "commented on your task:",
    designerCommentedOnTask: "commented on your task:",
    commentedOnAssignedTask: "commented on your assigned task:",
    on: "on"
  },
  ar: {
    newTaskAssigned: "مهمة جديدة مُكلفة",
    taskStatusUpdated: "تم تحديث حالة المهمة",
    taskCompleted: "تم إكمال المهمة",
    taskUpdated: "تم تحديث المهمة",
    adminCommentOnTask: "تعليق المشرف على مهمتك",
    newCommentOnTask: "تعليق جديد على المهمة",
    mediaBuyerComment: "تعليق مشتري الإعلانات",
    designerUpdate: "تحديث المصمم",
    newCommentOnYourTask: "تعليق جديد على مهمتك",
    youveBeenAssignedTask: "تم تكليفك بمهمة جديدة:",
    taskStatusUpdatedTo: "تم تحديث الحالة إلى",
    taskMarkedComplete: "تم تمييزها كمكتملة",
    adminCommentedOnTask: "علق المشرف على مهمتك:",
    commentedOnYourTask: "علق على مهمتك:",
    mediaBuyerCommentedOnTask: "علق مشتري الإعلانات على مهمتك:",
    designerCommentedOnTask: "علق المصمم على مهمتك:",
    commentedOnAssignedTask: "علق على مهمتك المُكلفة:",
    on: "على"
  }
};

/**
 * Get user's language preference from localStorage or default to English
 */
export const getUserLanguage = (userId?: string): 'en' | 'ar' => {
  try {
    // Try to get from localStorage first (current user)
    const stored = localStorage.getItem('preferredLanguage');
    if (stored === 'en' || stored === 'ar') {
      return stored;
    }
    
    // Default to English if no preference found
    return 'en';
  } catch (error) {
    console.error('Error getting user language:', error);
    return 'en';
  }
};

/**
 * Get translations for a specific language
 */
export const getTranslations = (language: 'en' | 'ar' = 'en') => {
  return translations[language] || translations.en;
};

/**
 * Create a multilingual task assignment notification
 */
export const createTaskAssignmentNotification = (
  taskTitle: string,
  language: 'en' | 'ar' = 'en'
) => {
  const t = getTranslations(language);
  return {
    title: t.newTaskAssigned,
    message: `${t.youveBeenAssignedTask} ${taskTitle}`
  };
};

/**
 * Create a multilingual task status update notification
 */
export const createTaskStatusNotification = (
  taskTitle: string,
  status: string,
  language: 'en' | 'ar' = 'en'
) => {
  const t = getTranslations(language);
  return {
    title: t.taskStatusUpdated,
    message: `${taskTitle} ${t.taskStatusUpdatedTo} ${status}`
  };
};

/**
 * Create a multilingual task completion notification
 */
export const createTaskCompletionNotification = (
  taskTitle: string,
  language: 'en' | 'ar' = 'en'
) => {
  const t = getTranslations(language);
  return {
    title: t.taskCompleted,
    message: `${taskTitle} ${t.taskMarkedComplete}`
  };
};

/**
 * Create a multilingual comment notification
 */
export const createCommentNotification = (
  userName: string,
  comment: string,
  taskTitle: string,
  commenterRole: string,
  commenterPosition: string,
  language: 'en' | 'ar' = 'en'
) => {
  const t = getTranslations(language);
  const commentPreview = comment.substring(0, 50) + (comment.length > 50 ? '...' : '');
  
  let title = t.newCommentOnYourTask;
  let message = `${userName} ${t.commentedOnYourTask} "${commentPreview}" ${t.on} "${taskTitle}"`;
  
  // Special handling based on commenter role/position
  if (commenterRole === 'admin') {
    title = t.adminCommentOnTask;
    message = `${userName} ${t.adminCommentedOnTask} "${commentPreview}" ${t.on} "${taskTitle}"`;
  } else if (commenterPosition === 'Media Buyer') {
    title = t.mediaBuyerComment;
    message = `${userName} ${t.mediaBuyerCommentedOnTask} "${commentPreview}" ${t.on} "${taskTitle}"`;
  } else if (commenterPosition === 'Designer') {
    title = t.designerUpdate;
    message = `${userName} ${t.designerCommentedOnTask} "${commentPreview}" ${t.on} "${taskTitle}"`;
  }
  
  return { title, message };
};

/**
 * Create a multilingual task update notification for admins
 */
export const createTaskUpdateNotification = (
  taskTitle: string,
  status: string,
  progress: number,
  language: 'en' | 'ar' = 'en'
) => {
  const t = getTranslations(language);
  return {
    title: t.taskUpdated,
    message: `${taskTitle} ${t.taskStatusUpdatedTo} ${status}, Progress: ${progress}%`
  };
}; 