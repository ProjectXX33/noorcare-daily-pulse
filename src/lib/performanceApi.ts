import { supabase } from '@/lib/supabase';
import { format, differenceInMinutes, addDays } from 'date-fns';

// Check if today is a day off for the user
export async function checkIfDayOff(userId: string, date: Date): Promise<{
  isDayOff: boolean;
  assignedShift?: any;
}> {
  try {
    const workDate = format(date, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('shift_assignments')
      .select(`
        *,
        shifts:assigned_shift_id(name, start_time, end_time)
      `)
      .eq('employee_id', userId)
      .eq('work_date', workDate)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return { isDayOff: false }; // No assignment = can work
    }

    return {
      isDayOff: data.is_day_off,
      assignedShift: data.shifts
    };
  } catch (error) {
    console.error('Error checking day off status:', error);
    return { isDayOff: false };
  }
}

// Calculate delay based on scheduled vs actual check-in time
export function calculateDelay(
  scheduledStartTime: string, // "09:00:00"
  actualCheckInTime: Date
): number {
  try {
    const [hours, minutes] = scheduledStartTime.split(':').map(Number);
    
    // Create scheduled time for today
    const scheduledTime = new Date(actualCheckInTime);
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // Calculate difference in minutes (positive = late, negative = early)
    let delayMinutes = differenceInMinutes(actualCheckInTime, scheduledTime);
    
    // Handle edge case: if delay is more than 24 hours, user probably checked in the wrong day
    // But for legitimate delays up to 12-15 hours, we should keep the actual value
    if (delayMinutes > 1440) { // More than 24 hours
      console.warn('⚠️ Detected unreasonable delay of', delayMinutes, 'minutes (>24h). Capping at 720 minutes (12 hours)');
      delayMinutes = 720;
    } else if (delayMinutes < -720) {
      // Handle edge case: if early by more than 12 hours, probably wrong day
      console.warn('⚠️ Detected unreasonable early check-in of', Math.abs(delayMinutes), 'minutes. Setting to 0');
      delayMinutes = 0;
    }
    
    // For negative delays (early check-ins), treat as 0 delay for performance calculation
    if (delayMinutes < 0) {
      delayMinutes = 0;
    }
    
    console.log('⏰ Delay calculation:', {
      scheduledTime: scheduledTime.toISOString(),
      actualTime: actualCheckInTime.toISOString(),
      rawDelayMinutes: differenceInMinutes(actualCheckInTime, scheduledTime),
      finalDelayMinutes: delayMinutes,
      status: delayMinutes > 0 ? `LATE by ${delayMinutes} minutes` : 'ON TIME OR EARLY'
    });
    
    return delayMinutes;
  } catch (error) {
    console.error('Error calculating delay:', error);
    return 0;
  }
}

// Calculate performance score based on delay
export function calculatePerformanceScore(delayMinutes: number): number {
  // Perfect score (100) decreases by 1 point per 5 minutes late
  // Early check-ins don't decrease score
  
  console.log('🎯 Calculating performance score for delay:', delayMinutes, 'minutes');
  
  if (delayMinutes <= 0) {
    // On time or early
    console.log('✅ On time/early - returning 100%');
    return 100.00;
  } else if (delayMinutes >= 500) { 
    // More than ~8 hours late = 0 score
    // This handles 12+ hour delays correctly (744 minutes > 500)
    console.log('❌ Very late (8+ hours) - returning 0%');
    return 0.00;
  } else {
    // Calculate score: 100 - (delay_minutes / 5)
    const score = Math.max(0, 100.00 - (delayMinutes / 5.0));
    console.log('📊 Calculated score:', score, '% for', delayMinutes, 'minutes late');
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }
}

// Calculate work duration score based on expected vs actual hours
export function calculateWorkDurationScore(
  actualHours: number, 
  expectedHours: number
): number {
  console.log('⏱️ Calculating work duration score:', { actualHours, expectedHours });
  
  if (actualHours >= expectedHours) {
    // Perfect score for working full time or overtime
    console.log('✅ Full time worked - returning 100%');
    return 100.00;
  } else if (actualHours <= 0) {
    // Zero score for not working
    console.log('❌ No work hours - returning 0%');
    return 0.00;
  } else {
    // Calculate proportional score based on hours worked
    const hoursShortage = expectedHours - actualHours;
    const score = Math.max(0, 100 - (hoursShortage * 15)); // 15 points penalty per hour shortage
    console.log('📊 Work duration score:', score, '% for', actualHours, '/', expectedHours, 'hours');
    return Math.round(score * 100) / 100;
  }
}

// Calculate comprehensive final performance score
export function calculateFinalPerformanceScore(
  delayMinutes: number,
  actualHours: number,
  expectedHours: number,
  overtimeHours: number = 0
): {
  delayScore: number;
  workDurationScore: number;
  finalScore: number;
  breakdown: string;
} {
  const delayScore = calculatePerformanceScore(delayMinutes);
  const workDurationScore = calculateWorkDurationScore(actualHours, expectedHours);
  
  // Weight calculation: 60% punctuality, 30% work duration, 10% overtime bonus
  let finalScore = (delayScore * 0.6) + (workDurationScore * 0.3);
  
  // Overtime bonus: up to 10 points for working extra hours
  const overtimeBonus = Math.min(10, overtimeHours * 2);
  finalScore += overtimeBonus;
  
  // Cap at 100%
  finalScore = Math.min(100, finalScore);
  finalScore = Math.round(finalScore * 100) / 100;
  
  const breakdown = `Punctuality: ${delayScore}% (60%) + Duration: ${workDurationScore}% (30%) + Overtime: +${overtimeBonus}pts = ${finalScore}%`;
  
  console.log('🏆 Final performance calculation:', {
    delayMinutes,
    actualHours,
    expectedHours,
    overtimeHours,
    delayScore,
    workDurationScore,
    overtimeBonus,
    finalScore,
    breakdown
  });
  
  return {
    delayScore,
    workDurationScore,
    finalScore,
    breakdown
  };
}

// Calculate performance status based on comprehensive metrics
export function calculatePerformanceStatus(
  finalScore: number,
  punctualityPercentage: number,
  workDurationScore?: number
): 'Poor' | 'Needs Improvement' | 'Good' | 'Excellent' {
  console.log('🏆 Calculating performance status:', { 
    finalScore, 
    punctualityPercentage, 
    workDurationScore 
  });

  // Poor: If any critical metric is very low
  if (finalScore < 50 || punctualityPercentage < 50) {
    console.log('❌ Status: Poor (critical metrics below 50%)');
    return 'Poor';
  }

  // Needs Improvement: If performance is below 70%
  if (finalScore < 70 || punctualityPercentage < 70) {
    console.log('⚠️ Status: Needs Improvement (metrics below 70%)');
    return 'Needs Improvement';
  }

  // Good: If performance is between 70-85%
  if (finalScore < 85 || punctualityPercentage < 85) {
    console.log('✅ Status: Good (metrics between 70-85%)');
    return 'Good';
  }

  // Excellent: If all metrics are 85% or above
  console.log('🌟 Status: Excellent (all metrics 85%+)');
  return 'Excellent';
}

// Record performance tracking when checking in
export async function recordCheckInPerformance(
  userId: string,
  workDate: Date,
  shiftId: string,
  scheduledStartTime: string,
  actualCheckInTime: Date
): Promise<void> {
  try {
    const delayMinutes = calculateDelay(scheduledStartTime, actualCheckInTime);
    const performanceScore = calculatePerformanceScore(delayMinutes);
    const monthYear = format(workDate, 'yyyy-MM');
    
    console.log('🎯 Recording check-in performance:', {
      userId,
      workDate: format(workDate, 'yyyy-MM-dd'),
      delayMinutes,
      performanceScore,
      monthYear
    });

    // Get employee name
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // First, record to the old performance_tracking table (for backwards compatibility)
    const performanceData = {
      employee_id: userId,
      work_date: format(workDate, 'yyyy-MM-dd'),
      shift_id: shiftId,
      scheduled_start_time: scheduledStartTime,
      actual_check_in_time: actualCheckInTime.toISOString(),
      delay_minutes: delayMinutes,
      performance_score: performanceScore
    };

    const { error: trackingError } = await supabase
      .from('performance_tracking')
      .upsert(performanceData);

    if (trackingError) {
      console.warn('Performance tracking table error (may not exist):', trackingError);
    }

    // NEW: Update or create record in admin_performance_dashboard table
    await updateDashboardPerformance(userId, userData.name, monthYear, {
      checkInDelay: delayMinutes,
      performanceScore: performanceScore,
      workingDay: true
    });

    console.log('✅ Performance recorded successfully');

  } catch (error) {
    console.error('❌ Error recording check-in performance:', error);
    throw error;
  }
}

// Update performance tracking when checking out
export async function recordCheckOutPerformance(
  userId: string,
  workDate: Date,
  actualCheckOutTime: Date,
  regularHours: number,
  overtimeHours: number
): Promise<{
  finalScore: number;
  feedback: ReturnType<typeof getCheckoutPerformanceFeedback>;
  performanceBreakdown?: any;
}> {
  try {
    const totalWorkMinutes = (regularHours + overtimeHours) * 60;
    const monthYear = format(workDate, 'yyyy-MM');
    
    console.log('🎯 Recording check-out performance:', {
      userId,
      workDate: format(workDate, 'yyyy-MM-dd'),
      regularHours,
      overtimeHours,
      totalWorkMinutes,
      monthYear
    });

    // Get employee name and check-in data for this day
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Get today's check-in record to calculate full performance
    const { data: checkInData, error: checkInError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', format(workDate, 'yyyy-MM-dd'))
      .lt('timestamp', format(addDays(workDate, 1), 'yyyy-MM-dd'))
      .single();

    if (checkInError) {
      console.warn('Could not find check-in record for performance calculation:', checkInError);
    }

    // Get shift information for performance calculation
    let shiftInfo = null;
    let delayMinutes = 0;
    let workDurationScore = 100; // Default perfect score
    let finalPerformanceScore = 100;
    let expectedHours = 8; // Default 8 hours
    let actualHours = regularHours + overtimeHours;
    let performanceResult: any = {
      delayScore: 100,
      workDurationScore: 100,
      finalScore: 100,
      breakdown: 'No shift data available - using defaults'
    };

    if (checkInData) {
      // Get shift assignment for this date
      const { data: shiftAssignment, error: shiftError } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          shifts:assigned_shift_id(name, start_time, end_time, duration_hours)
        `)
        .eq('employee_id', userId)
        .eq('work_date', format(workDate, 'yyyy-MM-dd'))
        .single();

      if (!shiftError && shiftAssignment && !shiftAssignment.is_day_off) {
        shiftInfo = shiftAssignment.shifts;
        
        // Calculate check-in delay
        delayMinutes = calculateDelay(shiftInfo.start_time, new Date(checkInData.timestamp));
        
        // Calculate work duration performance - different hours for different shifts
        if (shiftInfo.name && shiftInfo.name.toLowerCase().includes('day')) {
          expectedHours = 7; // Day shift is 7 hours
        } else if (shiftInfo.name && shiftInfo.name.toLowerCase().includes('night')) {
          expectedHours = 8; // Night shift is 8 hours
        } else {
          expectedHours = shiftInfo.duration_hours || 8; // Default 8 hours
        }
        actualHours = regularHours + overtimeHours;
        
        // Use comprehensive performance calculation
        performanceResult = calculateFinalPerformanceScore(
          delayMinutes,
          actualHours,
          expectedHours,
          overtimeHours
        );

        workDurationScore = performanceResult.workDurationScore;
        finalPerformanceScore = performanceResult.finalScore;
        
        console.log('📊 Complete performance calculation:', {
          delayMinutes,
          expectedHours,
          actualHours,
          overtimeHours,
          ...performanceResult,
          shiftName: shiftInfo.name
        });
      }
    }

    // Update old performance_tracking table (for backwards compatibility)
    const { error: trackingError } = await supabase
      .from('performance_tracking')
      .update({
        actual_check_out_time: actualCheckOutTime.toISOString(),
        total_work_minutes: totalWorkMinutes,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', userId)
      .eq('work_date', format(workDate, 'yyyy-MM-dd'));

    if (trackingError) {
      console.warn('Performance tracking update error (may not exist):', trackingError);
    }

    // Update admin_performance_dashboard with comprehensive checkout performance
    await updateDashboardPerformance(userId, userData.name, monthYear, {
      overtimeHours: overtimeHours,
      workingDay: true,
      // Include final performance score calculated at checkout
      finalPerformanceScore: finalPerformanceScore,
      workDurationScore: workDurationScore,
      totalWorkHours: regularHours + overtimeHours,
      // ALSO include delay data from check-in for complete record
      checkInDelay: delayMinutes,
      // Add work date to ensure proper tracking
      workDate: workDate.toISOString().split('T')[0]
    });

    console.log('✅ Complete check-out performance recorded successfully');

    // Generate performance feedback
    const feedback = getCheckoutPerformanceFeedback(
      finalPerformanceScore,
      delayMinutes,
      actualHours,
      expectedHours,
      overtimeHours
    );

    return {
      finalScore: finalPerformanceScore,
      feedback,
      performanceBreakdown: {
        delayMinutes,
        workDurationScore,
        finalScore: finalPerformanceScore,
        breakdown: performanceResult.breakdown
      }
    };

  } catch (error) {
    console.error('❌ Error recording check-out performance:', error);
    throw error;
  }
}

// NEW: Update or create performance record in admin_performance_dashboard
export async function updateDashboardPerformance(
  userId: string,
  employeeName: string,
  monthYear: string,
  updates: {
    checkInDelay?: number;
    performanceScore?: number;
    overtimeHours?: number;
    workingDay?: boolean;
    finalPerformanceScore?: number;
    workDurationScore?: number;
    totalWorkHours?: number;
    workDate?: string; // Add work date to track unique days
  }
): Promise<void> {
  try {
    console.log('📊 Updating dashboard performance:', { userId, employeeName, monthYear, updates });

    // Test database access first
    console.log('🔍 Testing database access...');
    const { data: testAccess, error: accessError } = await supabase
      .from('admin_performance_dashboard')
      .select('count')
      .eq('employee_id', userId)
      .eq('month_year', monthYear)
      .limit(1);

    if (accessError) {
      console.error('❌ Database access test failed:', accessError);
      throw new Error(`Database access denied: ${accessError.message}`);
    }
    console.log('✅ Database access test passed');

    // Get current record if exists
    const { data: existingRecord, error: fetchError } = await supabase
      .from('admin_performance_dashboard')
      .select('*')
      .eq('employee_id', userId)
      .eq('month_year', monthYear)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching existing record:', fetchError);
      throw new Error(`Failed to fetch existing record: ${fetchError.message}`);
    }

    console.log('📋 Existing record:', existingRecord ? 'Found' : 'Not found');

    let recordData: any = {
      employee_id: userId,
      employee_name: employeeName,
      month_year: monthYear,
      total_working_days: existingRecord?.total_working_days || 0,
      total_delay_minutes: existingRecord?.total_delay_minutes || 0,
      total_delay_hours: existingRecord?.total_delay_hours || 0,
      total_overtime_hours: existingRecord?.total_overtime_hours || 0,
      average_performance_score: existingRecord?.average_performance_score || 100,
      punctuality_percentage: existingRecord?.punctuality_percentage || 100,
    };

    // IMPROVED LOGIC: Count unique working days by tracking actual work dates
    if (updates.finalPerformanceScore !== undefined) {
      // This is a checkout update with complete performance data
      const workDate = updates.workDate || new Date().toISOString().split('T')[0];
      
      if (!existingRecord) {
        // First checkout - create new record
        recordData.total_working_days = 1;
        recordData.worked_dates = [workDate]; // Track the specific dates worked
        console.log('🆕 Checkout: Creating new performance record - working days set to 1 for date:', workDate);
      } else {
        // Existing record - check if this is a new working date
        const workedDates = existingRecord.worked_dates || [];
        
        if (!workedDates.includes(workDate)) {
          // New working date - increment
          recordData.total_working_days = existingRecord.total_working_days + 1;
          recordData.worked_dates = [...workedDates, workDate];
          console.log('📈 Checkout: New working date detected - incrementing to:', recordData.total_working_days, 'for date:', workDate);
        } else {
          // Same date already worked - don't increment
          recordData.total_working_days = existingRecord.total_working_days;
          recordData.worked_dates = workedDates;
          console.log('🔄 Checkout: Same date already worked - keeping working days at:', recordData.total_working_days);
        }
      }
    } else if (updates.workingDay && !existingRecord) {
      // Legacy check-in only logic (should rarely be used now)
      const workDate = updates.workDate || new Date().toISOString().split('T')[0];
      recordData.total_working_days = 1;
      recordData.worked_dates = [workDate];
      console.log('🆕 Legacy: Creating new record - working days set to 1');
    }

    if (updates.checkInDelay !== undefined) {
      // Only add positive delays (late check-ins)
      const delayToAdd = Math.max(0, updates.checkInDelay);
      recordData.total_delay_minutes = (existingRecord?.total_delay_minutes || 0) + delayToAdd;
      recordData.total_delay_hours = Math.round((recordData.total_delay_minutes / 60) * 100) / 100;
      console.log('⏰ Check-in: Updated delay:', { 
        newDelay: delayToAdd, 
        totalDelayMinutes: recordData.total_delay_minutes,
        totalDelayHours: recordData.total_delay_hours 
      });
    }

    if (updates.overtimeHours !== undefined) {
      recordData.total_overtime_hours = (existingRecord?.total_overtime_hours || 0) + updates.overtimeHours;
      recordData.total_overtime_hours = Math.round(recordData.total_overtime_hours * 100) / 100;
      console.log('⏰ Updated overtime hours:', recordData.total_overtime_hours);
    }

    if (updates.performanceScore !== undefined) {
      // Calculate running average of performance scores
      const currentAvg = existingRecord?.average_performance_score || 100;
      const totalDays = recordData.total_working_days;
      
      if (totalDays <= 1) {
        // First day - use the score directly
        recordData.average_performance_score = updates.performanceScore;
      } else {
        // Calculate weighted average
        recordData.average_performance_score = Math.round(((currentAvg * (totalDays - 1) + updates.performanceScore) / totalDays) * 100) / 100;
      }
      
      console.log('📊 Performance score updated:', {
        currentAvg,
        newScore: updates.performanceScore,
        totalDays,
        finalAvg: recordData.average_performance_score
      });
    }

    // Handle final performance score from checkout (comprehensive score)
    if (updates.finalPerformanceScore !== undefined) {
      // Use final performance score as the authoritative performance metric
      const currentAvg = existingRecord?.average_performance_score || 100;
      const totalDays = recordData.total_working_days;
      
      if (totalDays <= 1) {
        // First day - use the final score directly
        recordData.average_performance_score = updates.finalPerformanceScore;
      } else {
        // Calculate weighted average using final performance score
        recordData.average_performance_score = Math.round(((currentAvg * (totalDays - 1) + updates.finalPerformanceScore) / totalDays) * 100) / 100;
      }
      
      console.log('🎯 Final performance score updated at checkout:', {
        currentAvg,
        finalScore: updates.finalPerformanceScore,
        totalDays,
        finalAvg: recordData.average_performance_score
      });
    }

    // Track work duration and efficiency metrics
    if (updates.workDurationScore !== undefined) {
      // Store work duration score for analytics
      recordData.work_duration_score = updates.workDurationScore;
      console.log('⏱️ Work duration score recorded:', updates.workDurationScore);
    }

    if (updates.totalWorkHours !== undefined) {
      // Update total work hours for the month
      recordData.total_work_hours = (existingRecord?.total_work_hours || 0) + updates.totalWorkHours;
      recordData.total_work_hours = Math.round(recordData.total_work_hours * 100) / 100;
      console.log('📈 Total work hours updated:', recordData.total_work_hours);
    }

    // Calculate punctuality percentage correctly
    if (recordData.total_working_days > 0) {
      // If there's significant delay, punctuality should be very low
      if (recordData.total_delay_hours >= 1) {
        // More than 1 hour total delay = very poor punctuality
        recordData.punctuality_percentage = 0.0;
      } else if (recordData.total_delay_minutes > 30) {
        // 30+ minutes delay = poor punctuality  
        recordData.punctuality_percentage = Math.max(0, 50 - (recordData.total_delay_minutes * 2));
      } else if (recordData.total_delay_minutes > 0) {
        // Some delay but less than 30 minutes
        recordData.punctuality_percentage = Math.max(0, 90 - (recordData.total_delay_minutes * 3));
      } else {
        // No delays = perfect punctuality
        recordData.punctuality_percentage = 100.0;
      }
      
      console.log('🎯 Punctuality calculation:', {
        totalWorkingDays: recordData.total_working_days,
        totalDelayMinutes: recordData.total_delay_minutes,
        totalDelayHours: recordData.total_delay_hours,
        punctualityPercentage: recordData.punctuality_percentage
      });
    }

    // Calculate status using comprehensive performance metrics
    const avgScore = recordData.average_performance_score;
    const punctuality = recordData.punctuality_percentage;
    const workDurationScore = recordData.work_duration_score;
    
    recordData.performance_status = calculatePerformanceStatus(
      avgScore,
      punctuality,
      workDurationScore
    );

    console.log('🏆 Comprehensive status calculation:', {
      performanceScore: avgScore,
      punctuality: punctuality,
      workDurationScore: workDurationScore,
      finalStatus: recordData.performance_status
    });

    // Add timestamps
    recordData.updated_at = new Date().toISOString();
    if (!existingRecord) {
      recordData.created_at = new Date().toISOString();
    }

    console.log('💾 Attempting to save record data:', recordData);

    // Upsert the record with detailed error handling
    const { data: upsertResult, error: upsertError } = await supabase
      .from('admin_performance_dashboard')
      .upsert(recordData, {
        onConflict: 'employee_id,month_year'
      })
      .select();

    if (upsertError) {
      console.error('❌ Detailed upsert error:', {
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
        code: upsertError.code,
        recordData: recordData
      });
      throw new Error(`Failed to save performance data: ${upsertError.message}`);
    }

    console.log('✅ Dashboard performance updated successfully:', upsertResult);

  } catch (error) {
    console.error('❌ Complete error in updateDashboardPerformance:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Performance update failed: ${error.message}`);
    } else {
      throw new Error(`Performance update failed: ${String(error)}`);
    }
  }
}

// Update monthly performance summary (legacy function for compatibility)
export async function updateMonthlyPerformanceSummary(
  userId: string,
  monthYear: string
): Promise<void> {
  try {
    // This function is kept for backwards compatibility
    // The new updateDashboardPerformance handles this functionality
    console.log('Legacy updateMonthlyPerformanceSummary called - using new system');
  } catch (error) {
    console.error('Error updating monthly performance summary:', error);
  }
}

// Get delay notification message
export function getDelayNotificationMessage(delayMinutes: number, employeeName: string): {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
} {
  if (delayMinutes <= 5) {
    return {
      title: '✅ On Time Check-in',
      message: `${employeeName} checked in on time.`,
      severity: 'info'
    };
  } else if (delayMinutes <= 30) {
    return {
      title: '⚠️ Late Check-in',
      message: `${employeeName} is ${delayMinutes} minutes late.`,
      severity: 'warning'
    };
  } else {
    return {
      title: '🚨 Very Late Check-in',
      message: `${employeeName} is ${Math.round(delayMinutes / 60 * 10) / 10} hours late!`,
      severity: 'error'
    };
  }
}

// Send delay notification to admins
export async function notifyAdminsAboutDelay(
  delayMinutes: number,
  employeeName: string,
  adminId: string
): Promise<void> {
  try {
    if (delayMinutes <= 5) return; // No notification for on-time check-ins

    const notification = getDelayNotificationMessage(delayMinutes, employeeName);

    // Get all admin users
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (error) throw error;

    // Send notification to all admins
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      title: notification.title,
      message: notification.message,
      created_by: adminId,
      created_at: new Date().toISOString()
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) throw notificationError;

    console.log('Delay notification sent to admins:', notification);
  } catch (error) {
    console.error('Error sending delay notification:', error);
  }
}

// TEST FUNCTION: Verify performance calculation logic
export function testPerformanceCalculations(): void {
  console.log('🧪 TESTING PERFORMANCE CALCULATIONS:');
  
  const testCases = [
    { delay: 0, description: 'On time' },
    { delay: 15, description: '15 minutes late' },
    { delay: 60, description: '1 hour late' },
    { delay: 240, description: '4 hours late' },
    { delay: 480, description: '8 hours late' },
    { delay: 744, description: '12.4 hours late (744 minutes)' },
    { delay: 900, description: '15 hours late' }
  ];
  
  testCases.forEach(test => {
    const performanceScore = calculatePerformanceScore(test.delay);
    
    // Calculate punctuality based on our logic
    let punctuality = 100;
    if (test.delay >= 60) {
      punctuality = 0;
    } else if (test.delay > 30) {
      punctuality = Math.max(0, 50 - (test.delay * 2));
    } else if (test.delay > 0) {
      punctuality = Math.max(0, 90 - (test.delay * 3));
    }
    
    // Calculate status
    let status = 'Excellent';
    if (punctuality < 50 || performanceScore < 50) {
      status = 'Poor';
    } else if (punctuality < 70 || performanceScore < 70) {
      status = 'Needs Improvement';
    } else if (punctuality < 85 || performanceScore < 85) {
      status = 'Good';
    }
    
    console.log(`📊 ${test.description}:`, {
      delayMinutes: test.delay,
      performanceScore: performanceScore + '%',
      punctuality: punctuality + '%', 
      status
    });
  });
  
  console.log('🎯 VERIFICATION: 12.4 hour delay should show 0% performance, 0% punctuality, Poor status');
}

// ADMIN FUNCTION: Clear performance data for current month (for testing/fixing)
export async function clearCurrentMonthPerformanceData(): Promise<void> {
  try {
    const monthYear = format(new Date(), 'yyyy-MM');
    console.log('🗑️ Clearing performance data for month:', monthYear);
    
    const { error } = await supabase
      .from('admin_performance_dashboard')
      .delete()
      .eq('month_year', monthYear);
    
    if (error) throw error;
    
    console.log('✅ Performance data cleared successfully');
    
    // Run test calculations to verify logic
    testPerformanceCalculations();
    
  } catch (error) {
    console.error('❌ Error clearing performance data:', error);
    throw error;
  }
}

// Generate comprehensive performance summary for an employee
export async function generatePerformanceSummary(
  userId: string,
  monthYear: string
): Promise<{
  summary: any;
  recommendations: string[];
  achievements: string[];
} | null> {
  try {
    console.log('📋 Generating performance summary for:', { userId, monthYear });

    const { data: performanceData, error } = await supabase
      .from('admin_performance_dashboard')
      .select('*')
      .eq('employee_id', userId)
      .eq('month_year', monthYear)
      .single();

    if (error || !performanceData) {
      console.log('No performance data found for summary');
      return null;
    }

    const recommendations: string[] = [];
    const achievements: string[] = [];

    // Analyze punctuality
    if (performanceData.punctuality_percentage < 50) {
      recommendations.push('⏰ Focus on arriving on time - significant delays detected');
    } else if (performanceData.punctuality_percentage < 80) {
      recommendations.push('⏰ Work on improving punctuality - aim for consistent on-time arrivals');
    } else {
      achievements.push('⭐ Excellent punctuality record');
    }

    // Analyze performance score
    if (performanceData.average_performance_score < 50) {
      recommendations.push('📈 Overall performance needs significant improvement');
    } else if (performanceData.average_performance_score < 80) {
      recommendations.push('📈 Focus on consistency in daily performance');
    } else {
      achievements.push('🏆 Strong overall performance score');
    }

    // Analyze work hours and overtime
    if (performanceData.total_overtime_hours > 20) {
      achievements.push('💪 Excellent dedication with substantial overtime hours');
    } else if (performanceData.total_overtime_hours > 10) {
      achievements.push('👏 Good commitment with additional overtime work');
    }

    // Analyze total delay
    if (performanceData.total_delay_hours > 5) {
      recommendations.push('🚨 Address chronic lateness issues - total delay exceeds 5 hours');
    } else if (performanceData.total_delay_hours > 2) {
      recommendations.push('⚠️ Monitor punctuality - occasional delays noted');
    }

    // Performance status specific feedback
    switch (performanceData.performance_status) {
      case 'Excellent':
        achievements.push('🌟 Outstanding overall performance rating');
        break;
      case 'Good':
        recommendations.push('🎯 Continue good work - small improvements can lead to excellence');
        break;
      case 'Needs Improvement':
        recommendations.push('📚 Consider additional training or support to improve performance');
        break;
      case 'Poor':
        recommendations.push('🆘 Urgent attention needed - consider performance improvement plan');
        break;
    }

    return {
      summary: performanceData,
      recommendations,
      achievements
    };

  } catch (error) {
    console.error('Error generating performance summary:', error);
    return null;
  }
}

// Provide real-time performance feedback during checkout
export function getCheckoutPerformanceFeedback(
  finalScore: number,
  delayMinutes: number,
  actualHours: number,
  expectedHours: number,
  overtimeHours: number
): {
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  recommendations?: string[];
} {
  console.log('📢 Generating checkout feedback:', {
    finalScore,
    delayMinutes,
    actualHours,
    expectedHours,
    overtimeHours
  });

  const recommendations: string[] = [];
  
  if (finalScore >= 90) {
    return {
      message: `🌟 Outstanding performance today! Final score: ${finalScore}%${overtimeHours > 0 ? ` (including ${overtimeHours.toFixed(1)}h overtime bonus)` : ''}`,
      type: 'success'
    };
  } else if (finalScore >= 80) {
    if (delayMinutes > 0) {
      recommendations.push('⏰ Try to arrive on time tomorrow for an even better score');
    }
    if (actualHours < expectedHours) {
      recommendations.push(`⏱️ Work the full ${expectedHours} hours for maximum performance`);
    }
    
    return {
      message: `✅ Great work today! Final score: ${finalScore}%`,
      type: 'success',
      recommendations
    };
  } else if (finalScore >= 65) {
    if (delayMinutes > 30) {
      recommendations.push('⏰ Focus on punctuality - arriving on time significantly improves your score');
    }
    if (actualHours < expectedHours * 0.8) {
      recommendations.push('⏱️ Try to work closer to your full shift hours');
    }
    
    return {
      message: `⚠️ Good effort today. Final score: ${finalScore}%. Room for improvement!`,
      type: 'warning',
      recommendations
    };
  } else {
    if (delayMinutes > 60) {
      recommendations.push('🚨 Punctuality is critical - please ensure on-time arrival');
    }
    if (actualHours < expectedHours * 0.7) {
      recommendations.push('⏱️ Working full hours is essential for good performance');
    }
    recommendations.push('📚 Consider speaking with your supervisor about performance improvement');
    
    return {
      message: `❌ Performance needs attention. Final score: ${finalScore}%`,
      type: 'error',
      recommendations
    };
  }
} 