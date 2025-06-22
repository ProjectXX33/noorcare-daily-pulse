import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import { format } from 'date-fns';
import { getUserLanguage, createTaskAssignmentNotification } from '@/lib/multilingualNotifications';

// Types for different notification scenarios
interface PerformanceNotification {
  employeeId: string;
  employeeName: string;
  performanceScore: number;
  punctualityScore: number;
  workDurationScore?: number;
  delayMinutes: number;
  overtimeHours: number;
  workDate: Date;
  feedback: string;
  recommendations?: string[];
}

interface TaskAssignmentNotification {
  employeeId: string;
  employeeName: string;
  taskTitle: string;
  taskDescription: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  dueDate?: Date;
  assignedBy: string;
  assignedByName: string;
}

interface ShiftChangeNotification {
  employeeId: string;
  employeeName: string;
  oldShift?: {
    name: string;
    startTime: string;
    endTime: string;
    date: string;
  };
  newShift: {
    name: string;
    startTime: string;
    endTime: string;
    date: string;
  };
  changeType: 'assigned' | 'modified' | 'cancelled';
  changedBy: string;
  changedByName: string;
  reason?: string;
}

interface RatingNotification {
  employeeId: string;
  employeeName: string;
  ratingType: 'performance' | 'task' | 'behavior' | 'overall';
  rating: number;
  maxRating: number;
  ratedBy: string;
  ratedByName: string;
  feedback?: string;
  period?: string; // e.g., "Week 1 June 2025", "May 2025"
}

// 🎯 Performance Notifications
export async function notifyEmployeePerformance(data: PerformanceNotification): Promise<void> {
  try {
    console.log('📢 Sending performance notification to:', data.employeeName);

    // Determine performance level and emoji
    let performanceLevel = '';
    let emoji = '';
    let messageType: 'success' | 'warning' | 'error' | 'info' = 'info';

    if (data.performanceScore >= 95) {
      performanceLevel = 'Outstanding';
      emoji = '🌟';
      messageType = 'success';
    } else if (data.performanceScore >= 85) {
      performanceLevel = 'Excellent';
      emoji = '✅';
      messageType = 'success';
    } else if (data.performanceScore >= 70) {
      performanceLevel = 'Good';
      emoji = '👍';
      messageType = 'info';
    } else if (data.performanceScore >= 50) {
      performanceLevel = 'Needs Improvement';
      emoji = '⚠️';
      messageType = 'warning';
    } else {
      performanceLevel = 'Poor';
      emoji = '❌';
      messageType = 'error';
    }

    // Create detailed message
    let message = `${emoji} ${performanceLevel} Performance Today!\n\n`;
    message += `📊 Overall Score: ${data.performanceScore}%\n`;
    message += `⏰ Punctuality: ${data.punctualityScore}%\n`;
    
    if (data.workDurationScore) {
      message += `⏱️ Work Duration: ${data.workDurationScore}%\n`;
    }
    
    if (data.delayMinutes > 0) {
      message += `⏳ Late by: ${data.delayMinutes} minutes\n`;
    } else {
      message += `✨ On time check-in!\n`;
    }
    
    if (data.overtimeHours > 0) {
      message += `💪 Overtime: ${data.overtimeHours.toFixed(1)} hours\n`;
    }
    
    message += `\n${data.feedback}`;
    
    if (data.recommendations && data.recommendations.length > 0) {
      message += `\n\n💡 Recommendations:\n${data.recommendations.map(r => `• ${r}`).join('\n')}`;
    }

    await createNotification({
      user_id: data.employeeId,
      title: `${emoji} Daily Performance Report`,
      message: message,
      related_to: 'performance',
      related_id: data.employeeId,
      created_by: 'system'
    });

    console.log('✅ Performance notification sent successfully');

  } catch (error) {
    console.error('❌ Error sending performance notification:', error);
  }
}

// 📋 Task Assignment Notifications
export async function notifyEmployeeTaskAssignment(data: TaskAssignmentNotification): Promise<void> {
  try {
    console.log('📋 Sending task assignment notification to:', data.employeeName);

    const userLanguage = getUserLanguage(data.employeeId);
    
    // Priority emoji and urgency messages (multilingual)
    const priorityEmoji = {
      'Low': '🟢',
      'Medium': '🟡', 
      'High': '🟠',
      'Urgent': '🔴'
    };

    const urgencyMessages = {
      en: {
      'Low': 'Take your time with this one',
      'Medium': 'Please complete when convenient',
      'High': 'Please prioritize this task',
      'Urgent': 'URGENT: Immediate attention required!'
      },
      ar: {
        'Low': 'خذ وقتك في هذه المهمة',
        'Medium': 'يرجى الإكمال عند الملاءمة',
        'High': 'يرجى إعطاء الأولوية لهذه المهمة',
        'Urgent': 'عاجل: مطلوب اهتمام فوري!'
      }
    };

    const labels = {
      en: {
        newTaskAssigned: 'New Task Assigned!',
        priority: 'Priority',
        task: 'Task',
        description: 'Description',
        due: 'Due',
        assignedBy: 'Assigned by'
      },
      ar: {
        newTaskAssigned: 'مهمة جديدة مُكلفة!',
        priority: 'الأولوية',
        task: 'المهمة',
        description: 'الوصف',
        due: 'الموعد النهائي',
        assignedBy: 'مُكلف من'
      }
    };

    const t = labels[userLanguage] || labels.en;
    const urgencyT = urgencyMessages[userLanguage] || urgencyMessages.en;

    let message = `📋 ${t.newTaskAssigned}\n\n`;
    message += `${priorityEmoji[data.priority]} ${t.priority}: ${data.priority}\n`;
    message += `📝 ${t.task}: ${data.taskTitle}\n`;
    message += `📄 ${t.description}: ${data.taskDescription}\n`;
    
    if (data.dueDate) {
      message += `📅 ${t.due}: ${format(data.dueDate, 'PPP')}\n`;
    }
    
    message += `👤 ${t.assignedBy}: ${data.assignedByName}\n\n`;
    message += `💬 ${urgencyT[data.priority]}`;

    await createNotification({
      user_id: data.employeeId,
      title: `${priorityEmoji[data.priority]} ${userLanguage === 'ar' ? 'مهمة جديدة' : 'New Task'}: ${data.taskTitle}`,
      message: message,
      related_to: 'task',
      related_id: data.employeeId,
      created_by: data.assignedBy
    });

    console.log('✅ Task assignment notification sent successfully');

  } catch (error) {
    console.error('❌ Error sending task assignment notification:', error);
  }
}

// 🔄 Shift Change Notifications
export async function notifyEmployeeShiftChange(data: ShiftChangeNotification): Promise<void> {
  try {
    console.log('🔄 Sending shift change notification to:', data.employeeName);

    let emoji = '';
    let title = '';
    let changeMessage = '';

    switch (data.changeType) {
      case 'assigned':
        emoji = '📅';
        title = 'New Shift Assigned';
        changeMessage = `You have been assigned to a new shift:`;
        break;
      case 'modified':
        emoji = '🔄';
        title = 'Shift Modified';
        changeMessage = `Your shift has been updated:`;
        break;
      case 'cancelled':
        emoji = '❌';
        title = 'Shift Cancelled';
        changeMessage = `Your shift has been cancelled:`;
        break;
    }

    let message = `${emoji} ${changeMessage}\n\n`;
    
    if (data.oldShift && data.changeType === 'modified') {
      message += `📅 Previous: ${data.oldShift.name}\n`;
      message += `⏰ Was: ${data.oldShift.startTime} - ${data.oldShift.endTime}\n`;
      message += `📆 Date: ${data.oldShift.date}\n\n`;
      message += `🔄 Updated to:\n`;
    }
    
    if (data.changeType !== 'cancelled') {
      message += `📅 Shift: ${data.newShift.name}\n`;
      message += `⏰ Time: ${data.newShift.startTime} - ${data.newShift.endTime}\n`;
      message += `📆 Date: ${data.newShift.date}\n`;
    }
    
    message += `\n👤 Changed by: ${data.changedByName}`;
    
    if (data.reason) {
      message += `\n💬 Reason: ${data.reason}`;
    }

    await createNotification({
      user_id: data.employeeId,
      title: `${emoji} ${title}`,
      message: message,
      related_to: 'shift',
      related_id: data.employeeId,
      created_by: data.changedBy
    });

    console.log('✅ Shift change notification sent successfully');

  } catch (error) {
    console.error('❌ Error sending shift change notification:', error);
  }
}

// ⭐ Rating Notifications
export async function notifyEmployeeRating(data: RatingNotification): Promise<void> {
  try {
    console.log('⭐ Sending rating notification to:', data.employeeName);

    // Calculate percentage and determine performance level
    const percentage = (data.rating / data.maxRating) * 100;
    
    let ratingLevel = '';
    let emoji = '';

    if (percentage >= 90) {
      ratingLevel = 'Outstanding';
      emoji = '🌟';
    } else if (percentage >= 80) {
      ratingLevel = 'Excellent';
      emoji = '⭐';
    } else if (percentage >= 70) {
      ratingLevel = 'Good';
      emoji = '👍';
    } else if (percentage >= 60) {
      ratingLevel = 'Satisfactory';
      emoji = '👌';
    } else {
      ratingLevel = 'Needs Improvement';
      emoji = '⚠️';
    }

    const ratingTypeDisplay = {
      'performance': 'Performance',
      'task': 'Task Completion',
      'behavior': 'Behavior & Attitude',
      'overall': 'Overall Performance'
    };

    let message = `${emoji} ${ratingLevel} ${ratingTypeDisplay[data.ratingType]} Rating!\n\n`;
    message += `⭐ Rating: ${data.rating}/${data.maxRating} (${percentage.toFixed(1)}%)\n`;
    message += `📋 Category: ${ratingTypeDisplay[data.ratingType]}\n`;
    
    if (data.period) {
      message += `📅 Period: ${data.period}\n`;
    }
    
    message += `👤 Rated by: ${data.ratedByName}\n`;
    
    if (data.feedback) {
      message += `\n💬 Feedback:\n${data.feedback}`;
    }

    // Add motivational message based on rating
    if (percentage >= 90) {
      message += `\n\n🎉 Outstanding work! Keep up the excellent performance!`;
    } else if (percentage >= 80) {
      message += `\n\n✨ Great job! You're doing excellent work!`;
    } else if (percentage >= 70) {
      message += `\n\n👏 Good work! Small improvements can make you excellent!`;
    } else if (percentage >= 60) {
      message += `\n\n💪 You're on the right track. Keep working to improve!`;
    } else {
      message += `\n\n🚀 There's room for improvement. Let's work together to boost your performance!`;
    }

    await createNotification({
      user_id: data.employeeId,
      title: `${emoji} ${ratingTypeDisplay[data.ratingType]} Rating: ${percentage.toFixed(1)}%`,
      message: message,
      related_to: 'rating',
      related_id: data.employeeId,
      created_by: data.ratedBy
    });

    console.log('✅ Rating notification sent successfully');

  } catch (error) {
    console.error('❌ Error sending rating notification:', error);
  }
}

// 🎯 Comprehensive Employee Update (All-in-One)
export async function notifyEmployeeComprehensiveUpdate(
  employeeId: string,
  updates: {
    performance?: PerformanceNotification;
    tasks?: TaskAssignmentNotification[];
    shiftChanges?: ShiftChangeNotification[];
    ratings?: RatingNotification[];
    customMessage?: string;
  }
): Promise<void> {
  try {
    console.log('📋 Sending comprehensive update to employee:', employeeId);

    // Send individual notifications for each type
    if (updates.performance) {
      await notifyEmployeePerformance(updates.performance);
    }

    if (updates.tasks && updates.tasks.length > 0) {
      for (const task of updates.tasks) {
        await notifyEmployeeTaskAssignment(task);
      }
    }

    if (updates.shiftChanges && updates.shiftChanges.length > 0) {
      for (const shiftChange of updates.shiftChanges) {
        await notifyEmployeeShiftChange(shiftChange);
      }
    }

    if (updates.ratings && updates.ratings.length > 0) {
      for (const rating of updates.ratings) {
        await notifyEmployeeRating(rating);
      }
    }

    // Send summary notification if multiple updates
    const updateCount = 
      (updates.performance ? 1 : 0) +
      (updates.tasks?.length || 0) +
      (updates.shiftChanges?.length || 0) +
      (updates.ratings?.length || 0);

    if (updateCount > 1) {
      let summaryMessage = `📋 You have ${updateCount} new updates:\n\n`;
      
      if (updates.performance) {
        summaryMessage += `• 📊 Performance Report\n`;
      }
      if (updates.tasks?.length) {
        summaryMessage += `• 📋 ${updates.tasks.length} New Task${updates.tasks.length > 1 ? 's' : ''}\n`;
      }
      if (updates.shiftChanges?.length) {
        summaryMessage += `• 🔄 ${updates.shiftChanges.length} Shift Update${updates.shiftChanges.length > 1 ? 's' : ''}\n`;
      }
      if (updates.ratings?.length) {
        summaryMessage += `• ⭐ ${updates.ratings.length} New Rating${updates.ratings.length > 1 ? 's' : ''}\n`;
      }
      
      summaryMessage += `\nCheck your notifications for details!`;
      
      if (updates.customMessage) {
        summaryMessage += `\n\n💬 Additional Message:\n${updates.customMessage}`;
      }

      await createNotification({
        user_id: employeeId,
        title: `📋 ${updateCount} New Updates`,
        message: summaryMessage,
        related_to: 'summary',
        related_id: employeeId,
        created_by: 'system'
      });
    }

    console.log('✅ Comprehensive update notifications sent successfully');

  } catch (error) {
    console.error('❌ Error sending comprehensive update:', error);
  }
}

// 🚀 Auto-notify on Performance Checkout
export async function autoNotifyPerformanceOnCheckout(
  employeeId: string,
  performanceData: {
    finalScore: number;
    delayMinutes: number;
    actualHours: number;
    expectedHours: number;
    overtimeHours: number;
    punctualityScore: number;
    workDurationScore: number;
    feedback: any;
  }
): Promise<void> {
  try {
    // Get employee name
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', employeeId)
      .single();

    if (userError) throw userError;

    await notifyEmployeePerformance({
      employeeId,
      employeeName: userData.name,
      performanceScore: performanceData.finalScore,
      punctualityScore: performanceData.punctualityScore,
      workDurationScore: performanceData.workDurationScore,
      delayMinutes: performanceData.delayMinutes,
      overtimeHours: performanceData.overtimeHours,
      workDate: new Date(),
      feedback: performanceData.feedback.message,
      recommendations: performanceData.feedback.recommendations
    });

  } catch (error) {
    console.error('❌ Error in auto-notify performance:', error);
  }
} 