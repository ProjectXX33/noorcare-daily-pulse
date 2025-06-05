// Admin Notification Tool
// Use this to send task assignments, shift changes, and ratings to employees

(async function adminNotificationTool() {
  console.log('🔧 Admin Notification Tool');
  console.log('═'.repeat(50));
  
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase not found. Make sure you are on the Noorcare app page');
    return;
  }
  
  // Check if current user is admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('❌ Auth error or no user logged in');
    return;
  }
  
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('id', user.id)
    .single();
  
  if (userError || userData.role !== 'admin') {
    console.error('❌ Admin access required');
    return;
  }
  
  console.log('👑 Admin access confirmed:', userData.name);
  
  // Notification functions (would be imported in real app)
  async function createNotification(data) {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        related_to: data.related_to,
        related_id: data.related_id,
        created_by: data.created_by
      }]);
    
    if (error) {
      console.error('❌ Error creating notification:', error);
      return false;
    }
    
    console.log('✅ Notification sent successfully');
    return true;
  }
  
  // Get all employees
  const { data: employees, error: empError } = await supabase
    .from('users')
    .select('id, name, position, department')
    .neq('role', 'admin')
    .order('name');
  
  if (empError) {
    console.error('❌ Error fetching employees:', empError);
    return;
  }
  
  console.log('\n👥 Available Employees:');
  employees.forEach((emp, index) => {
    console.log(`${index + 1}. ${emp.name} (${emp.position} - ${emp.department})`);
  });
  
  // Tool Functions
  window.adminNotifications = {
    
    // 📋 Send Task Assignment
    assignTask: async function(employeeIndex, taskTitle, taskDescription, priority = 'Medium', dueDays = 3) {
      const employee = employees[employeeIndex - 1];
      if (!employee) {
        console.error('❌ Invalid employee index');
        return;
      }
      
      console.log(`📋 Assigning task to ${employee.name}...`);
      
      const priorityEmoji = {
        'Low': '🟢',
        'Medium': '🟡',
        'High': '🟠', 
        'Urgent': '🔴'
      };
      
      const urgencyMessage = {
        'Low': 'Take your time with this one',
        'Medium': 'Please complete when convenient',
        'High': 'Please prioritize this task',
        'Urgent': 'URGENT: Immediate attention required!'
      };
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);
      
      let message = `📋 New Task Assigned!\n\n`;
      message += `${priorityEmoji[priority]} Priority: ${priority}\n`;
      message += `📝 Task: ${taskTitle}\n`;
      message += `📄 Description: ${taskDescription}\n`;
      message += `📅 Due: ${dueDate.toLocaleDateString()}\n`;
      message += `👤 Assigned by: ${userData.name}\n\n`;
      message += `💬 ${urgencyMessage[priority]}`;
      
      await createNotification({
        user_id: employee.id,
        title: `${priorityEmoji[priority]} New Task: ${taskTitle}`,
        message: message,
        related_to: 'task',
        related_id: employee.id,
        created_by: user.id
      });
    },
    
    // 🔄 Send Shift Change
    changeShift: async function(employeeIndex, newShiftName, newStartTime, newEndTime, reason = '') {
      const employee = employees[employeeIndex - 1];
      if (!employee) {
        console.error('❌ Invalid employee index');
        return;
      }
      
      console.log(`🔄 Notifying ${employee.name} of shift change...`);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      let message = `📅 You have been assigned to a new shift:\n\n`;
      message += `📅 Shift: ${newShiftName}\n`;
      message += `⏰ Time: ${newStartTime} - ${newEndTime}\n`;
      message += `📆 Date: ${tomorrow.toLocaleDateString()}\n`;
      message += `\n👤 Changed by: ${userData.name}`;
      
      if (reason) {
        message += `\n💬 Reason: ${reason}`;
      }
      
      await createNotification({
        user_id: employee.id,
        title: `📅 New Shift Assigned`,
        message: message,
        related_to: 'shift',
        related_id: employee.id,
        created_by: user.id
      });
    },
    
    // ⭐ Send Rating
    rateEmployee: async function(employeeIndex, ratingType, rating, maxRating = 5, feedback = '') {
      const employee = employees[employeeIndex - 1];
      if (!employee) {
        console.error('❌ Invalid employee index');
        return;
      }
      
      console.log(`⭐ Rating ${employee.name}...`);
      
      const percentage = (rating / maxRating) * 100;
      
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
      
      let message = `${emoji} ${ratingLevel} ${ratingTypeDisplay[ratingType]} Rating!\n\n`;
      message += `⭐ Rating: ${rating}/${maxRating} (${percentage.toFixed(1)}%)\n`;
      message += `📋 Category: ${ratingTypeDisplay[ratingType]}\n`;
      message += `📅 Period: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n`;
      message += `👤 Rated by: ${userData.name}\n`;
      
      if (feedback) {
        message += `\n💬 Feedback:\n${feedback}`;
      }
      
      // Add motivational message
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
        user_id: employee.id,
        title: `${emoji} ${ratingTypeDisplay[ratingType]} Rating: ${percentage.toFixed(1)}%`,
        message: message,
        related_to: 'rating',
        related_id: employee.id,
        created_by: user.id
      });
    },
    
    // 📢 Send Custom Message
    sendMessage: async function(employeeIndex, title, message) {
      const employee = employees[employeeIndex - 1];
      if (!employee) {
        console.error('❌ Invalid employee index');
        return;
      }
      
      console.log(`📢 Sending message to ${employee.name}...`);
      
      await createNotification({
        user_id: employee.id,
        title: title,
        message: message,
        related_to: 'message',
        related_id: employee.id,
        created_by: user.id
      });
    },
    
    // 📋 Send to All Employees
    sendToAll: async function(title, message) {
      console.log('📢 Sending message to all employees...');
      
      for (const employee of employees) {
        await createNotification({
          user_id: employee.id,
          title: title,
          message: message,
          related_to: 'announcement',
          related_id: employee.id,
          created_by: user.id
        });
      }
      
      console.log(`✅ Message sent to ${employees.length} employees`);
    }
  };
  
  // Usage Examples
  console.log('\n🛠️ ADMIN NOTIFICATION TOOLS LOADED!');
  console.log('━'.repeat(50));
  console.log('📋 Task Assignment:');
  console.log('   adminNotifications.assignTask(1, "Update Database", "Review customer records", "High", 2)');
  console.log('');
  console.log('🔄 Shift Change:');
  console.log('   adminNotifications.changeShift(1, "Night Shift", "20:00", "04:00", "Coverage needed")');
  console.log('');
  console.log('⭐ Rate Employee:');
  console.log('   adminNotifications.rateEmployee(1, "overall", 4, 5, "Great work this month!")');
  console.log('');
  console.log('📢 Send Message:');
  console.log('   adminNotifications.sendMessage(1, "Meeting Tomorrow", "Please attend team meeting at 2 PM")');
  console.log('');
  console.log('📋 Send to All:');
  console.log('   adminNotifications.sendToAll("Company Update", "New policies effective next week")');
  console.log('━'.repeat(50));
  
})(); 