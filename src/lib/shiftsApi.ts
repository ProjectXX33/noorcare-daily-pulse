import { supabase } from '@/lib/supabase';
import { Shift, MonthlyShift, WorkTimeConfig } from '@/types';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';

// Work Time Configuration API
export async function fetchWorkTimeConfig(): Promise<WorkTimeConfig | null> {
  try {
    const { data, error } = await supabase
      .from('work_time_config')
      .select('*')
      .eq('name', 'default')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      dailyResetTime: data.daily_reset_time,
      workDayStart: data.work_day_start,
      workDayEnd: data.work_day_end,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  } catch (error) {
    console.error('Error fetching work time config:', error);
    throw error;
  }
}

// Get current work day boundaries for check-in/out reset (4 AM)
// Work day starts at 9AM but check-in/out resets at 4AM for night shift support
export async function getCurrentWorkDayBoundaries(): Promise<{ workDayStart: Date; workDayEnd: Date }> {
  try {
    const config = await fetchWorkTimeConfig();
    const resetTimeStr = config?.dailyResetTime || '04:00:00'; // Check-in/out reset at 4 AM
    
    const now = new Date();
    const [resetHour, resetMinute] = resetTimeStr.split(':').map(Number);
    
    // Create reset time for today
    const todayReset = new Date();
    todayReset.setHours(resetHour, resetMinute, 0, 0);
    
    let workDayStart: Date;
    let workDayEnd: Date;
    
    if (now < todayReset) {
      // Current time is before today's reset (e.g., 3 AM), so we're still in "yesterday's" work day
      workDayStart = new Date(todayReset);
      workDayStart.setDate(workDayStart.getDate() - 1); // Yesterday's reset time
      workDayEnd = new Date(todayReset); // Today's reset time
    } else {
      // Current time is after today's reset, so we're in "today's" work day
      workDayStart = new Date(todayReset); // Today's reset time
      workDayEnd = new Date(todayReset);
      workDayEnd.setDate(workDayEnd.getDate() + 1); // Tomorrow's reset time
    }
    
    console.log('📅 Work day boundaries:', {
      resetTime: resetTimeStr,
      currentTime: now.toISOString(),
      workDayStart: workDayStart.toISOString(),
      workDayEnd: workDayEnd.toISOString(),
      isInCurrentWorkDay: now >= workDayStart && now < workDayEnd
    });
    
    return { workDayStart, workDayEnd };
  } catch (error) {
    console.error('Error getting work day boundaries:', error);
    // Fallback to midnight-based boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { workDayStart: today, workDayEnd: tomorrow };
  }
}

// Check if a given timestamp falls within the current work day
export async function isInCurrentWorkDay(timestamp: Date): Promise<boolean> {
  const { workDayStart, workDayEnd } = await getCurrentWorkDayBoundaries();
  return timestamp >= workDayStart && timestamp < workDayEnd;
}

// Shifts API
export async function fetchShifts(): Promise<Shift[]> {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('is_active', true)
      .order('start_time');

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      name: item.name,
      startTime: item.start_time,
      endTime: item.end_time,
      position: item.position as 'Customer Service' | 'Designer',
      isActive: item.is_active,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
  } catch (error) {
    console.error('Error fetching shifts:', error);
    throw error;
  }
}

// Monthly Shifts API
export async function fetchMonthlyShifts(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<MonthlyShift[]> {
  try {
    let query = supabase
      .from('monthly_shifts')
      .select(`
        *,
        users:user_id(name),
        shifts:shift_id(name, start_time, end_time)
      `)
      .gte('work_date', format(startDate, 'yyyy-MM-dd'))
      .lte('work_date', format(endDate, 'yyyy-MM-dd'))
      .order('work_date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      shiftId: item.shift_id,
      workDate: new Date(item.work_date),
      checkInTime: item.check_in_time ? new Date(item.check_in_time) : undefined,
      checkOutTime: item.check_out_time ? new Date(item.check_out_time) : undefined,
      regularHours: item.regular_hours,
      overtimeHours: item.overtime_hours,
      delayMinutes: item.delay_minutes || 0,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      userName: item.users?.name,
      shiftName: item.shifts?.name,
      shiftStartTime: item.shifts?.start_time,
      shiftEndTime: item.shifts?.end_time
    }));
  } catch (error) {
    console.error('Error fetching monthly shifts:', error);
    throw error;
  }
}

// Calculate hours with flexible overtime rules
// Work day starts at 9AM, but overtime is calculated based on actual work periods
export function calculateWorkHours(
  checkInTime: Date,
  checkOutTime: Date,
  shift: Shift
): { regularHours: number; overtimeHours: number } {
  
  const totalMinutes = differenceInMinutes(checkOutTime, checkInTime);
  const totalHours = totalMinutes / 60;
  
  // Standard work hours: Day shift: 7 hours, Night shift: 8 hours
  let standardWorkHours = 8; // Default to 8 hours for night shift
  if (shift.name.toLowerCase().includes('day')) {
    standardWorkHours = 7; // Day shift is 7 hours
  } else if (shift.name.toLowerCase().includes('night')) {
    standardWorkHours = 8; // Night shift is 8 hours
  }
  
  // Calculate overtime based on new rules:
  // Day shift: Before 9AM or after 4PM = overtime
  // Night shift: Between 12AM-4AM = overtime (if not checked out)
  let overtimeHours = 0;
  let regularHours = totalHours;
  
  if (shift.name.toLowerCase().includes('day')) {
    // Day shift overtime calculation
    const checkInHour = checkInTime.getHours();
    const checkOutHour = checkOutTime.getHours();
    
    // Early morning overtime (before 9AM)
    if (checkInHour < 9) {
      const earlyStart = new Date(checkInTime);
      earlyStart.setHours(9, 0, 0, 0);
      
      if (checkInTime < earlyStart) {
        const earlyMinutes = differenceInMinutes(earlyStart, checkInTime);
        overtimeHours += earlyMinutes / 60;
      }
    }
    
    // Evening overtime (after 4PM)
    if (checkOutHour >= 16) {
      const regularEnd = new Date(checkOutTime);
      regularEnd.setHours(16, 0, 0, 0);
      
      if (checkOutTime > regularEnd) {
        const lateMinutes = differenceInMinutes(checkOutTime, regularEnd);
        overtimeHours += lateMinutes / 60;
      }
    }
    
    // Regular hours = total - overtime, but minimum of standard hours
    regularHours = Math.min(totalHours - overtimeHours, standardWorkHours);
    
  } else if (shift.name.toLowerCase().includes('night')) {
    // Night shift overtime calculation
    // Check if work extends between 12AM-4AM
    const midnightToday = new Date(checkInTime);
    midnightToday.setHours(24, 0, 0, 0); // Next day midnight
    
    const fourAM = new Date(checkInTime);
    fourAM.setDate(fourAM.getDate() + 1);
    fourAM.setHours(4, 0, 0, 0); // Next day 4AM
    
    // If checkout time is between midnight and 4AM, it's overtime
    if (checkOutTime >= midnightToday && checkOutTime <= fourAM) {
      const lateNightMinutes = differenceInMinutes(checkOutTime, midnightToday);
      overtimeHours = lateNightMinutes / 60;
      regularHours = totalHours - overtimeHours;
    } else {
      // Standard calculation if no late night work
      regularHours = Math.min(totalHours, standardWorkHours);
      overtimeHours = Math.max(0, totalHours - standardWorkHours);
    }
  } else {
    // Default calculation for other shifts
    regularHours = Math.min(totalHours, standardWorkHours);
    overtimeHours = Math.max(0, totalHours - standardWorkHours);
  }
  
  // Ensure non-negative values
  regularHours = Math.max(0, regularHours);
  overtimeHours = Math.max(0, overtimeHours);
  

  
  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100
  };
}

// Create or update monthly shift record
export async function createOrUpdateMonthlyShift(
  userId: string,
  shiftId: string,
  workDate: Date,
  checkInTime: Date,
  checkOutTime?: Date,
  shift?: Shift
): Promise<MonthlyShift> {
  try {
    let regularHours = 0;
    let overtimeHours = 0;
    let delayMinutes = 0;
    
    // Calculate delay time based on shift start time
    if (shift) {
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      const scheduledStart = new Date(checkInTime);
      scheduledStart.setHours(startHour, startMin, 0, 0);
      
      // Calculate delay in minutes (only positive delays count)
      const delayMs = checkInTime.getTime() - scheduledStart.getTime();
      delayMinutes = Math.max(0, delayMs / (1000 * 60));
    }
    
    // Calculate hours if we have both check-in and check-out times and shift info
    if (checkOutTime && shift) {
      const calculated = calculateWorkHours(checkInTime, checkOutTime, shift);
      regularHours = calculated.regularHours;
      overtimeHours = calculated.overtimeHours;
    }
    
    // Check if record already exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('monthly_shifts')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', format(workDate, 'yyyy-MM-dd'))
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    let result;
    
    if (existingRecord) {
      // Update existing record
      const { data, error } = await supabase
        .from('monthly_shifts')
        .update({
          shift_id: shiftId,
          check_in_time: checkInTime.toISOString(),
          check_out_time: checkOutTime?.toISOString() || null,
          regular_hours: regularHours,
          overtime_hours: overtimeHours,
          delay_minutes: delayMinutes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id)
        .select(`
          *,
          users:user_id(name),
          shifts:shift_id(name, start_time, end_time)
        `)
        .single();
        
      if (error) throw error;
      result = data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('monthly_shifts')
        .insert({
          user_id: userId,
          shift_id: shiftId,
          work_date: format(workDate, 'yyyy-MM-dd'),
          check_in_time: checkInTime.toISOString(),
          check_out_time: checkOutTime?.toISOString() || null,
          regular_hours: regularHours,
          overtime_hours: overtimeHours,
          delay_minutes: delayMinutes
        })
        .select(`
          *,
          users:user_id(name),
          shifts:shift_id(name, start_time, end_time)
        `)
        .single();
        
      if (error) throw error;
      result = data;
    }
    
    return {
      id: result.id,
      userId: result.user_id,
      shiftId: result.shift_id,
      workDate: new Date(result.work_date),
      checkInTime: result.check_in_time ? new Date(result.check_in_time) : undefined,
      checkOutTime: result.check_out_time ? new Date(result.check_out_time) : undefined,
      regularHours: result.regular_hours,
      overtimeHours: result.overtime_hours,
      delayMinutes: result.delay_minutes || 0,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
      userName: result.users?.name,
      shiftName: result.shifts?.name,
      shiftStartTime: result.shifts?.start_time,
      shiftEndTime: result.shifts?.end_time
    };
  } catch (error) {
    console.error('Error creating/updating monthly shift:', error);
    throw error;
  }
}

// Get assigned shift for a user on a specific date
export async function getAssignedShift(userId: string, workDate: Date): Promise<Shift | null> {
  try {
    const formattedDate = format(workDate, 'yyyy-MM-dd');
    console.log('🔍 Checking assigned shift:', { userId, formattedDate });

    const { data, error } = await supabase
      .from('shift_assignments')
      .select(`
        *,
        shifts:assigned_shift_id(*)
      `)
      .eq('employee_id', userId)
      .eq('work_date', formattedDate)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('ℹ️ No shift assignment found for user on date:', { userId, formattedDate });
      } else {
        console.error('❌ Error fetching shift assignment:', error);
      }
      return null;
    }

    if (!data) {
      console.log('ℹ️ No assignment data returned');
      return null;
    }

    if (data.is_day_off) {
      console.log('🏖️ User has day off:', { userId, formattedDate });
      return null;
    }

    if (!data.shifts) {
      console.log('⚠️ No shift data in assignment:', data);
      return null;
    }

    const shift: Shift = {
      id: data.shifts.id,
      name: data.shifts.name,
      startTime: data.shifts.start_time,
      endTime: data.shifts.end_time,
      position: data.shifts.position as 'Customer Service' | 'Designer',
      isActive: data.shifts.is_active,
      createdAt: new Date(data.shifts.created_at),
      updatedAt: new Date(data.shifts.updated_at)
    };

    console.log('✅ Assigned shift found:', { 
      userId, 
      formattedDate, 
      shiftName: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime
    });
    return shift;
  } catch (error) {
    console.error('❌ Error getting assigned shift:', error);
    return null;
  }
}

// Enhanced shift determination with better logging
export async function determineShift(checkInTime: Date, shifts: Shift[], userId?: string): Promise<Shift | null> {
  console.log('🎯 Starting shift determination:', {
    checkInTime: checkInTime.toISOString(),
    availableShifts: shifts.map(s => ({ id: s.id, name: s.name, startTime: s.startTime })),
    userId
  });

  // First try to get assigned shift if we have a userId
  if (userId) {
    console.log('👤 Checking assigned shift for user:', userId);
    try {
      const assignedShift = await getAssignedShift(userId, checkInTime);
      if (assignedShift) {
        console.log('✅ Using assigned shift:', assignedShift.name);
        return assignedShift;
      } else {
        console.log('⚠️ No assigned shift found for user');
      }
    } catch (error) {
      console.error('❌ Error checking assigned shift:', error);
    }
  }

  // Fallback to time-based detection (legacy behavior)
  console.log('🔄 Falling back to time-based detection');
  return determineShiftByTime(checkInTime, shifts);
}

// Legacy time-based shift detection (renamed from original determineShift)
export function determineShiftByTime(checkInTime: Date, shifts: Shift[]): Shift | null {
  const checkInHour = checkInTime.getHours();
  const checkInMinute = checkInTime.getMinutes();
  const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
  
  console.log('Determining shift by time for check-in time:', {
    checkInTime: checkInTime.toISOString(),
    checkInHour,
    checkInMinute,
    checkInTotalMinutes,
    availableShifts: shifts
  });

  for (const shift of shifts) {
    const [startHour, startMin] = shift.startTime.split(':').map(Number);
    const [endHour, endMin] = shift.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMin;
    let endTotalMinutes = endHour * 60 + endMin;
    
    // Handle shifts that cross midnight (like Night Shift 16:00-00:00)
    if (endHour === 0 || endHour < startHour) {
      endTotalMinutes += 24 * 60; // Add 24 hours
    }
    
    console.log(`Checking shift: ${shift.name}`, {
      startTime: shift.startTime,
      endTime: shift.endTime,
      startTotalMinutes,
      endTotalMinutes,
      checkInTotalMinutes
    });
    
    // Expanded tolerance and logic for shift detection
    const tolerance = 120; // 2 hours tolerance before and after shift start
    
    // Check if check-in time falls within this shift's start window
    if (checkInTotalMinutes >= (startTotalMinutes - tolerance) && 
        checkInTotalMinutes <= (startTotalMinutes + tolerance)) {
      console.log(`✅ Shift detected by time: ${shift.name} (within start window)`);
      return shift;
    }
    
    // For shifts that cross midnight, check if we're in the evening part
    if (endTotalMinutes > 24 * 60 && checkInTotalMinutes >= startTotalMinutes) {
      console.log(`✅ Shift detected by time: ${shift.name} (evening part of night shift)`);
      return shift;
    }
    
    // Alternative logic: if check-in is between shift start and end
    if (endTotalMinutes <= 24 * 60 && 
        checkInTotalMinutes >= startTotalMinutes && 
        checkInTotalMinutes <= endTotalMinutes) {
      console.log(`✅ Shift detected by time: ${shift.name} (within shift hours)`);
      return shift;
    }
  }
  
  console.warn('❌ No matching shift found for check-in time');
  
  // Fallback: return the closest shift based on start time
  const closestShift = shifts.reduce((closest, shift) => {
    const [startHour, startMin] = shift.startTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMin;
    const currentDistance = Math.abs(checkInTotalMinutes - startTotalMinutes);
    
    const [closestStartHour, closestStartMin] = closest.startTime.split(':').map(Number);
    const closestStartTotalMinutes = closestStartHour * 60 + closestStartMin;
    const closestDistance = Math.abs(checkInTotalMinutes - closestStartTotalMinutes);
    
    return currentDistance < closestDistance ? shift : closest;
  });
  
  console.log(`🔄 Using closest shift as fallback: ${closestShift.name}`);
  return closestShift;
} 