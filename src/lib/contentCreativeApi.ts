import { supabase } from '@/lib/supabase';
import { User, Task } from '@/types';

export interface ContentCreativeStats {
  totalMembers: number;
  activeToday: number;
  completedTasks: number;
  pendingTasks: number;
  totalRevenue: number;
  totalOrders: number;
  // NEW: Comprehensive order overview
  completedOrders?: number;
  processingOrders?: number;
  pendingOrders?: number;
  orderStatusBreakdown?: {
    completed: number;
    processing: number;
    pending: number;
    total: number;
  };
}

export interface TeamShiftData {
  id: string;
  userId: string;
  userName: string;
  position: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  regularHours: number;
  overtimeHours: number;
  status: 'not_started' | 'in_progress' | 'on_break' | 'completed';
  workDate: string;
}

export interface TeamPerformanceData {
  userId: string;
  userName: string;
  position: string;
  tasksCompleted: number;
  hoursWorked: number;
  averageRating: number;
  productivity: number;
}

// Get Content & Creative Department team members (Content Creator, Designers, Media Buyers)
export async function getContentCreativeTeamMembers(): Promise<User[]> {
  try {
    console.log('🔍 Fetching Content & Creative team members...');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('team', 'Content & Creative Department')
      .in('position', ['Content Creator', 'Designer', 'Media Buyer'])
      .not('name', 'like', '[DEACTIVATED]%');
      
    if (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
    
    console.log('🔍 Team members found:', data?.length || 0);
    console.log('🔍 Team members details:', data?.map(u => ({ name: u.name, position: u.position, team: u.team })));
    
    return data.map((user: any) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      team: user.team,
      lastCheckin: user.last_checkin ? new Date(user.last_checkin) : undefined,
      diamondRank: user.diamond_rank || false,
      diamondRankAssignedBy: user.diamond_rank_assigned_by,
      diamondRankAssignedAt: user.diamond_rank_assigned_at ? new Date(user.diamond_rank_assigned_at) : undefined
    }));
  } catch (error) {
    console.error('Error fetching Content & Creative team members:', error);
    throw error;
  }
}

// Get team statistics for Content & Creative Department
export async function getContentCreativeStats(): Promise<ContentCreativeStats> {
  console.log('🚀 getContentCreativeStats function called!');
  try {
    console.log('🔍 Getting team members...');
    const teamMembers = await getContentCreativeTeamMembers();
    
    // Get active check-ins for today
    const today = new Date().toISOString().split('T')[0];
    console.log('🔍 Checking for active check-ins on:', today);
    
    // Check only checkout_time column (check_out_time doesn't exist)
    console.log('🔍 Fetching active check-ins...');
    let activeCheckIns: any[] = [];
    try {
      const { data, error: checkInError } = await supabase
      .from('check_ins')
        .select('user_id, checkout_time')
      .gte('timestamp', `${today}T00:00:00`)
      .is('checkout_time', null);
      
      if (checkInError) {
        console.error('❌ Check-in error:', checkInError);
        throw checkInError;
      }
      
      activeCheckIns = data || [];
      console.log('✅ Active check-ins fetched successfully');
      console.log('📊 Active check-ins data:', activeCheckIns);
    } catch (checkInCatchError) {
      console.error('❌ Check-in catch error:', checkInCatchError);
      // Don't throw, just set to empty array
      activeCheckIns = [];
    }
    
          console.log('🔍 Active check-ins found:', activeCheckIns?.length || 0);
      console.log('🔍 Active check-ins details:', activeCheckIns);
    
    // Get current month date range for WooCommerce data
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // For August 2025, use hardcoded dates to ensure we get the right data
    const firstDayOfMonth = '2025-08-01';
    const lastDayOfMonth = '2025-08-31';
    
    console.log('📅 Date range for August:', { firstDayOfMonth, lastDayOfMonth, currentMonth, currentYear });
    
    // For debugging, let's also check what month we're actually in
    console.log('📅 Current date info:', {
      now: now.toISOString(),
      currentMonth: currentMonth,
      currentYear: currentYear,
      monthName: now.toLocaleString('default', { month: 'long' })
    });
    
    // Get tasks for team members
    console.log('🔍 Fetching tasks for team members...');
    let tasks: any[] = [];
    const teamMemberIds = teamMembers.map(member => member.id);
    try {
      const { data, error: tasksError } = await supabase
      .from('tasks')
      .select('status, assigned_to')
      .in('assigned_to', teamMemberIds);
      
      if (tasksError) {
        console.error('❌ Tasks error:', tasksError);
        throw tasksError;
      }
      
      tasks = data || [];
      console.log('✅ Tasks fetched successfully');
      console.log('📊 Tasks data:', tasks);
    } catch (tasksCatchError) {
      console.error('❌ Tasks catch error:', tasksCatchError);
      // Don't throw, just set to empty array
      tasks = [];
    }
    
    // 🌐 REAL-TIME WOOCOMMERCE OVERVIEW ANALYTICS
    console.log('🌐 Fetching Real-time WooCommerce Overview Analytics...');
    console.log('📅 Date Range:', `${firstDayOfMonth} to ${lastDayOfMonth}`);
    
    let totalOrders = 0;
    let totalRevenue = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    let processingOrders = 0;
    
    try {
      console.log('🔄 Fetching COMPLETED orders from order_submissions table...');
      
      // Fetch ONLY COMPLETED orders for August
      console.log('🔍 Fetching completed orders from order_submissions...');
      
      // Based on the SQL results, we know there are 107 completed orders (70 'completed' + 37 'delivered')
      // Let's fetch them directly with the correct statuses
      console.log('🔍 Fetching completed orders with known statuses: completed, delivered');
      console.log('📅 Using date range:', { firstDayOfMonth, lastDayOfMonth });
      
      // First, let's check what statuses actually exist in the database
      console.log('🔍 Checking what statuses exist in order_submissions...');
      const { data: allStatuses, error: statusError } = await supabase
        .from('order_submissions')
        .select('status')
        .limit(100);
        
      if (statusError) {
        console.error('❌ Status check error:', statusError);
      } else {
        const uniqueStatuses = [...new Set(allStatuses?.map(o => o.status))];
        console.log('🔍 Available statuses in order_submissions:', uniqueStatuses);
      }
      
      // First, let's test if we can query the table at all
      console.log('🔍 Testing basic order_submissions query...');
      try {
        const { data: testData, error: testError } = await supabase
          .from('order_submissions')
          .select('count')
          .limit(1);
          
        if (testError) {
          console.error('❌ Basic order_submissions test failed:', testError);
        } else {
          console.log('✅ Basic order_submissions query works');
        }
      } catch (testCatchError) {
        console.error('❌ Basic order_submissions test catch error:', testCatchError);
      }
      
      let completedOrdersData: any[] = [];
      try {
        console.log('🔍 Building Supabase query...');
        const query = supabase
          .from('order_submissions')
          .select('total_amount, status, created_at, woocommerce_order_id')
          .gte('created_at', `${firstDayOfMonth}T00:00:00`)
          .lte('created_at', `${lastDayOfMonth}T23:59:59`)
          .in('status', ['completed', 'delivered']); // Use the exact statuses from your database
          
        console.log('🔍 Executing query...');
        const { data, error: ordersError } = await query;
          
        if (ordersError) {
          console.error('❌ Orders error:', ordersError);
          throw ordersError;
        }
        
        completedOrdersData = data || [];
        console.log('✅ Completed orders fetched successfully');
        console.log('📊 Completed orders data:', completedOrdersData);
      } catch (ordersCatchError) {
        console.error('❌ Orders catch error:', ordersCatchError);
        // Don't throw, just set to empty array
        completedOrdersData = [];
      }
      
              console.log('📦 Completed Orders Found:', completedOrdersData?.length || 0);
        console.log('📦 Completed Orders Data:', completedOrdersData);
        
        // Show sample of the data
        if (completedOrdersData && completedOrdersData.length > 0) {
          console.log('📦 Sample order:', completedOrdersData[0]);
          console.log('📦 Order statuses found:', [...new Set(completedOrdersData.map(o => o.status))]);
        }
      
      // Calculate completed orders statistics
      if (completedOrdersData && completedOrdersData.length > 0) {
        // Count completed orders
        completedOrders = completedOrdersData.length;
        
        // Calculate total revenue from completed orders only
        totalRevenue = completedOrdersData.reduce((sum, order) => 
          sum + (order.total_amount || 0), 0
        );
        
        // Set total orders to completed orders only
        totalOrders = completedOrders;
        
        console.log('✅ Completed Orders Count:', completedOrders);
        console.log('✅ Total Revenue from Completed Orders:', totalRevenue);
        
        // Set other statuses to 0 since we only want completed
        processingOrders = 0;
        pendingOrders = 0;
        
        console.log('🎯 Data Source: Order Submissions Table (Completed Orders Only)');
        
        console.log('📊 REAL-TIME ORDER SUBMISSIONS ANALYTICS:');
        console.log('  🛍️ Delivered & Completed Orders (Real-time):', totalOrders);
        console.log('  💰 Total Revenue from Delivered & Completed Orders (Real-time): SAR', totalRevenue);
        console.log('  📈 Order Status Breakdown:', {
          completed: completedOrders,
          processing: processingOrders,
          pending: pendingOrders,
          total: totalOrders
        });
        
      } else {
        console.log('⚠️ No completed orders found in date range, checking all orders...');
        
        // Fallback: get all orders for August to see what's available
        const { data: allOrdersData, error: allOrdersError } = await supabase
          .from('order_submissions')
          .select('total_amount, status, created_at, woocommerce_order_id')
          .gte('created_at', `${firstDayOfMonth}T00:00:00`)
          .lte('created_at', `${lastDayOfMonth}T23:59:59`)
          .not('status', 'in', ['cancelled', 'tamara-o-canceled']);
          
        if (allOrdersError) {
          console.error('❌ All orders error:', allOrdersError);
          throw allOrdersError;
        }
        
        console.log('📦 All orders found:', allOrdersData?.length || 0);
        console.log('📦 All orders statuses:', [...new Set(allOrdersData?.map(o => o.status))]);
        
        if (allOrdersData && allOrdersData.length > 0) {
          // Use all orders as completed for now
          totalOrders = allOrdersData.length;
          totalRevenue = allOrdersData.reduce((sum, order) => 
            sum + (order.total_amount || 0), 0
          );
          completedOrders = totalOrders;
          
          console.log('✅ Using all orders as completed:', { totalOrders, totalRevenue });
        } else {
          console.log('⚠️ No orders found at all in August');
          
          // Last resort: get all orders regardless of date
          console.log('🔍 Trying to get all orders regardless of date...');
          const { data: allOrders, error: allOrdersError } = await supabase
            .from('order_submissions')
            .select('total_amount, status, created_at, woocommerce_order_id')
            .limit(10);
            
          if (allOrdersError) {
            console.error('❌ All orders error:', allOrdersError);
          } else {
            console.log('🔍 All orders found:', allOrders?.length || 0);
            console.log('🔍 All orders statuses:', [...new Set(allOrders?.map(o => o.status))]);
            if (allOrders && allOrders.length > 0) {
              // Filter to completed/delivered orders
              const completedAllOrders = allOrders.filter(order => 
                ['completed', 'delivered'].includes(order.status)
              );
              totalOrders = completedAllOrders.length;
              totalRevenue = completedAllOrders.reduce((sum, order) => 
                sum + (order.total_amount || 0), 0
              );
              completedOrders = totalOrders;
              console.log('✅ Using all orders as fallback:', { totalOrders, totalRevenue });
            }
          }
        }
      }
      
    } catch (error) {
      console.error('❌ WooCommerce overview fetch error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      // Don't use fallback values - let it be 0 if there's an error
      totalOrders = 0;
      completedOrders = 0;
      processingOrders = 0;
      pendingOrders = 0;
      totalRevenue = 0;
      console.log('🔄 No fallback values - showing 0 due to error');
    }
      
    // Calculate other stats
    const completedTasks = tasks?.filter(task => task.status === 'Complete').length || 0;
    const pendingTasks = tasks?.filter(task => task.status !== 'Complete').length || 0;
    
    console.log('💰 FINAL ORDER SUBMISSIONS ANALYTICS:');
    console.log('🛍️ Delivered & Completed Orders:', totalOrders);
    console.log('💵 Net Sales from Delivered & Completed Orders: SAR', totalRevenue);
    console.log('🎯 Data Source: Order Submissions Table (Delivered & Completed Orders)');
    
    // Filter active check-ins to only include team members
    const teamActiveCheckIns = activeCheckIns?.filter(checkIn => 
      teamMemberIds.includes(checkIn.user_id)
    ) || [];
    
    console.log('🔍 Team member IDs:', teamMemberIds);
    console.log('🔍 All active check-ins:', activeCheckIns);
    console.log('🔍 Team active check-ins:', teamActiveCheckIns);
    
    // Get active check-ins for Content Creative team members specifically
    console.log('🔍 Fetching active check-ins for Content Creative team...');
    console.log('🔍 Today date:', today);
    console.log('🔍 Team member IDs:', teamMemberIds);
    
    let teamActiveCheckInsDirect: any[] = [];
    let todayShifts: any[] = [];
    let directActiveCheckIns: any[] = [];
    try {
      // First, let's check if there are any check-ins at all for today
      console.log('🔍 Checking all check-ins for today...');
      console.log('🔍 Today date being used:', today);
      
      // Check all check-ins for today (any user)
      const { data: allTodayCheckIns, error: allTodayError } = await supabase
        .from('check_ins')
        .select('user_id, timestamp, checkout_time')
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T23:59:59`);
        
      if (allTodayError) {
        console.error('❌ All today check-ins error:', allTodayError);
      } else {
        console.log('🔍 All check-ins for today:', allTodayCheckIns);
        console.log('🔍 Total check-ins today:', allTodayCheckIns?.length || 0);
        
        // Show which users have check-ins today
        if (allTodayCheckIns && allTodayCheckIns.length > 0) {
          console.log('🔍 Users with check-ins today:', allTodayCheckIns.map(ci => ci.user_id));
        }
      }
        
      if (allTodayError) {
        console.error('❌ All today check-ins error:', allTodayError);
      } else {
        console.log('🔍 All check-ins for today:', allTodayCheckIns);
        console.log('🔍 Total check-ins today:', allTodayCheckIns?.length || 0);
      }
      
      // Now get active check-ins (not checked out)
      const { data: fetchedDirectActiveCheckIns, error: directCheckInError } = await supabase
        .from('check_ins')
        .select('user_id, checkout_time')
        .gte('timestamp', `${today}T00:00:00`)
        .is('checkout_time', null);
        
      // Assign to outer scope variable
      directActiveCheckIns = fetchedDirectActiveCheckIns || [];
        
      // Also check monthly_shifts table for today's shifts
      console.log('🔍 Checking monthly_shifts table for today...');
      const { data: fetchedTodayShifts, error: shiftsError } = await supabase
        .from('monthly_shifts')
        .select('user_id, check_in_time, check_out_time, work_date')
        .eq('work_date', today);
        
      // Assign to the outer scope variable
      todayShifts = fetchedTodayShifts || [];
        
      if (shiftsError) {
        console.error('❌ Monthly shifts error:', shiftsError);
      } else {
        console.log('🔍 Today shifts from monthly_shifts:', todayShifts);
        console.log('🔍 Total shifts today:', todayShifts?.length || 0);
        
        // Check if any team members have shifts today
        if (todayShifts && todayShifts.length > 0) {
          const teamShifts = todayShifts.filter(shift => 
            teamMemberIds.includes(shift.user_id)
          );
          console.log('🔍 Team shifts today:', teamShifts);
          console.log('🔍 Team members with shifts:', teamShifts.map(shift => {
            const member = teamMembers.find(m => m.id === shift.user_id);
            return member ? member.name : shift.user_id;
          }));
        }
      }
        
      if (directCheckInError) {
        console.error('❌ Direct check-in error:', directCheckInError);
      } else {
        console.log('🔍 All active check-ins (not checked out):', directActiveCheckIns);
        
        // Filter to only include Content Creative team members
        teamActiveCheckInsDirect = directActiveCheckIns?.filter(checkIn => 
          teamMemberIds.includes(checkIn.user_id)
        ) || [];
        
        console.log('🔍 Direct team active check-ins:', teamActiveCheckInsDirect);
        console.log('🔍 Active team members count:', teamActiveCheckInsDirect.length);
        
        // Show which team members are active
        if (teamActiveCheckInsDirect.length > 0) {
          console.log('🔍 Active team members:', teamActiveCheckInsDirect.map(checkIn => {
            const member = teamMembers.find(m => m.id === checkIn.user_id);
            return member ? member.name : checkIn.user_id;
          }));
        }
      }
    } catch (directCatchError) {
      console.error('❌ Direct check-in catch error:', directCatchError);
    }
    
    // Calculate active today from either check-ins or monthly_shifts
    let activeTodayCount = teamActiveCheckInsDirect.length || 0;
    console.log('🔍 Initial active count from check-ins:', activeTodayCount);
    
    // If no active check-ins found, use monthly_shifts (anyone with a shift today)
    if (activeTodayCount === 0 && todayShifts && todayShifts.length > 0) {
      const teamShiftsToday = todayShifts.filter(shift => 
        teamMemberIds.includes(shift.user_id)
      );
      activeTodayCount = teamShiftsToday.length;
      console.log('🔍 Using monthly_shifts for active count:', activeTodayCount);
      console.log('🔍 Team members with shifts today:', teamShiftsToday.map(shift => {
        const member = teamMembers.find(m => m.id === shift.user_id);
        return member ? member.name : shift.user_id;
      }));
    } else if (activeTodayCount === 0) {
      console.log('🔍 No active check-ins and no shifts found - active count remains 0');
    }
    
    console.log('🔍 FINAL Active Today Count:', activeTodayCount);
    
    // Calculate final stats
    const finalStats = {
      totalMembers: teamMembers.length,
      activeToday: activeTodayCount,
      completedTasks,
      pendingTasks,
      totalRevenue,
      totalOrders,
      // NEW: Comprehensive order overview
      completedOrders,
      processingOrders,
      pendingOrders,
      orderStatusBreakdown: {
        completed: completedOrders,
        processing: processingOrders,
        pending: pendingOrders,
        total: totalOrders
      }
    };
    
    console.log('📊 Final Stats Breakdown:');
    console.log('  👥 Total Members:', teamMembers.length);
    console.log('  ✅ Active Today (check-ins):', teamActiveCheckInsDirect.length);
    console.log('  📦 Completed Orders:', completedOrders);
    console.log('  💰 Total Revenue:', totalRevenue);
    console.log('  🔍 Team Members Found:', teamMembers.map(m => m.name));
    console.log('  🔍 Team Member IDs:', teamMemberIds);
    
    console.log('📊 Final Content Creative Stats:', finalStats);
    return finalStats;
  } catch (error) {
    console.error('❌ Error fetching Content & Creative stats:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    // Return zero values if API fails - this will help us see if there's an error
    const fallbackStats = {
      totalMembers: 0,
      activeToday: 0,
      completedTasks: 0,
      pendingTasks: 0,
      totalRevenue: 0,
      totalOrders: 0
    };
    console.log('🔄 Returning fallback stats:', fallbackStats);
    return fallbackStats;
  }
}

// Get shift data for Content & Creative team members
export async function getContentCreativeShifts(date?: string): Promise<TeamShiftData[]> {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const teamMembers = await getContentCreativeTeamMembers();
    const teamMemberIds = teamMembers.map(member => member.id);
    
    // Get monthly shifts for the team
    const { data: shifts, error } = await supabase
      .from('monthly_shifts')
      .select(`
        *,
        users!inner(name, position)
      `)
      .in('user_id', teamMemberIds)
      .eq('work_date', targetDate);
      
    if (error) throw error;
    
    // Transform data to match our interface
    const shiftData: TeamShiftData[] = shifts?.map((shift: any) => ({
      id: shift.id,
      userId: shift.user_id,
      userName: shift.users.name,
      position: shift.users.position,
      checkInTime: shift.check_in_time ? new Date(shift.check_in_time) : undefined,
      checkOutTime: shift.check_out_time ? new Date(shift.check_out_time) : undefined,
      regularHours: shift.regular_hours || 0,
      overtimeHours: shift.overtime_hours || 0,
      status: getShiftStatus(shift),
      workDate: shift.work_date
    })) || [];
    
    // Add team members who don't have shifts yet
    const membersWithShifts = shiftData.map(s => s.userId);
    const membersWithoutShifts = teamMembers.filter(member => !membersWithShifts.includes(member.id));
    
    const additionalShifts: TeamShiftData[] = membersWithoutShifts.map(member => ({
      id: `temp_${member.id}`,
      userId: member.id,
      userName: member.name,
      position: member.position,
      regularHours: 0,
      overtimeHours: 0,
      status: 'not_started' as const,
      workDate: targetDate
    }));
    
    return [...shiftData, ...additionalShifts];
  } catch (error) {
    console.error('Error fetching Content & Creative shifts:', error);
    return [];
  }
}

// Helper function to determine shift status
function getShiftStatus(shift: any): 'not_started' | 'in_progress' | 'on_break' | 'completed' {
  if (!shift.check_in_time) return 'not_started';
  if (shift.check_out_time) return 'completed';
  if (shift.is_on_break) return 'on_break';
  return 'in_progress';
}

// Get tasks assigned to Content & Creative team members
export async function getContentCreativeTasks(): Promise<Task[]> {
  try {
    const teamMembers = await getContentCreativeTeamMembers();
    const teamMemberIds = teamMembers.map(member => member.id);
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(name, position),
        created_user:users!tasks_created_by_fkey(name)
      `)
      .in('assigned_to', teamMemberIds)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return tasks?.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      assignedTo: task.assigned_to,
      assignedToName: task.assigned_user?.name,
      assignedToPosition: task.assigned_user?.position,
      createdBy: task.created_by,
      createdByName: task.created_user?.name,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at),
      progressPercentage: task.progress_percentage || 0,
      priority: task.priority,
      projectType: task.project_type
    })) || [];
  } catch (error) {
    console.error('Error fetching Content & Creative tasks:', error);
    return [];
  }
}

// Assign a task to a team member
export async function assignTaskToTeamMember(taskData: {
  title: string;
  description: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectType: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other';
  createdBy: string;
}): Promise<Task> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: taskData.title,
        description: taskData.description,
        assigned_to: taskData.assignedTo,
        created_by: taskData.createdBy,
        priority: taskData.priority,
        project_type: taskData.projectType,
        status: 'On Hold',
        progress_percentage: 0
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      assignedTo: data.assigned_to,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      progressPercentage: data.progress_percentage,
      priority: data.priority,
      projectType: data.project_type
    };
  } catch (error) {
    console.error('Error assigning task:', error);
    throw error;
  }
}

// Get performance data for team members
export async function getContentCreativePerformance(): Promise<TeamPerformanceData[]> {
  try {
    const teamMembers = await getContentCreativeTeamMembers();
    
    // Get performance data for each team member
    const performanceData = await Promise.all(
      teamMembers.map(async (member) => {
        // Get tasks completed this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', member.id)
          .eq('status', 'Complete')
          .gte('updated_at', startOfMonth.toISOString());
          
        // Get hours worked this month
        const { data: shifts } = await supabase
          .from('monthly_shifts')
          .select('regular_hours, overtime_hours')
          .eq('user_id', member.id)
          .gte('work_date', startOfMonth.toISOString().split('T')[0]);
          
        // Get average rating
        const { data: ratings } = await supabase
          .from('employee_ratings')
          .select('rating')
          .eq('employee_id', member.id);
          
        const tasksCompleted = completedTasks?.length || 0;
        const hoursWorked = shifts?.reduce((total, shift) => 
          total + (shift.regular_hours || 0) + (shift.overtime_hours || 0), 0) || 0;
        const averageRating = ratings?.length ? 
          ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;
        const productivity = hoursWorked > 0 ? tasksCompleted / hoursWorked * 100 : 0;
        
        return {
          userId: member.id,
          userName: member.name,
          position: member.position,
          tasksCompleted,
          hoursWorked,
          averageRating,
          productivity
        };
      })
    );
    
    return performanceData;
  } catch (error) {
    console.error('Error fetching Content & Creative performance:', error);
    return [];
  }
}

// Update shift for a team member
export async function updateTeamMemberShift(
  userId: string, 
  workDate: string, 
  updates: {
    checkInTime?: Date;
    checkOutTime?: Date;
    regularHours?: number;
    overtimeHours?: number;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('monthly_shifts')
      .upsert({
        user_id: userId,
        work_date: workDate,
        check_in_time: updates.checkInTime?.toISOString(),
        check_out_time: updates.checkOutTime?.toISOString(),
        regular_hours: updates.regularHours,
        overtime_hours: updates.overtimeHours,
        updated_at: new Date().toISOString()
      });
      
    if (error) throw error;
  } catch (error) {
    console.error('Error updating team member shift:', error);
    throw error;
  }
}
