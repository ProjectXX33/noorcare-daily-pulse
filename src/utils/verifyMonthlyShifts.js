import { supabase } from '@/lib/supabase';

/**
 * Verify and fix monthly shift calculations
 * This ensures all monthly shift records have correct overtime and delay calculations
 */
export async function verifyAndFixMonthlyShifts() {
  console.log('🔍 Verifying monthly shift calculations...');
  
  try {
    // Get all monthly shifts with their related data
    const { data: monthlyShifts, error } = await supabase
      .from('monthly_shifts')
      .select(`
        *,
        shifts:shift_id(name, start_time, end_time),
        users:user_id(name, position)
      `)
      .not('check_in_time', 'is', null)
      .not('check_out_time', 'is', null)
      .order('work_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching monthly shifts:', error);
      return { success: false, error: error.message };
    }

    console.log(`📊 Found ${monthlyShifts.length} records to verify...`);

    let recordsFixed = 0;
    const fixes = [];

    for (const record of monthlyShifts) {
      if (!record.shifts) {
        console.warn(`⚠️ Skipping record ${record.id} - no shift data`);
        continue;
      }

      const checkInTime = new Date(record.check_in_time);
      const checkOutTime = new Date(record.check_out_time);
      const shift = record.shifts;

      // Recalculate delay
      const [startHour, startMin] = shift.start_time.split(':').map(Number);
      const scheduledStart = new Date(checkInTime);
      scheduledStart.setHours(startHour, startMin, 0, 0);
      const delayMs = checkInTime.getTime() - scheduledStart.getTime();
      const correctDelayMinutes = Math.max(0, delayMs / (1000 * 60));

      // Recalculate hours
      const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      // Standard work hours based on shift type
      let standardWorkHours = 8; // Default to night shift
      if (shift.name.toLowerCase().includes('day')) {
        standardWorkHours = 7; // Day shift is 7 hours
      }

      // Calculate correct overtime based on shift type
      let correctRegularHours, correctOvertimeHours;
      
      if (shift.name.toLowerCase().includes('day')) {
        // Day shift: COUNTER-BASED overtime calculation
        // Overtime starts ONLY after completing required 7 hours
        
        if (totalHours <= standardWorkHours) {
          // Still within required shift hours - NO overtime yet
          correctRegularHours = totalHours;
          correctOvertimeHours = 0;
        } else {
          // Completed required hours - NOW overtime starts
          correctRegularHours = standardWorkHours; // 7 hours regular (completed)
          correctOvertimeHours = totalHours - standardWorkHours; // Additional time = overtime
        }
      } else if (shift.name.toLowerCase().includes('night')) {
        // Night shift: NEW LOGIC - Work day ends at 4AM (not midnight)
        // Standard night shift calculation based on total hours worked
        
        if (totalHours <= standardWorkHours) {
          // Within standard 8 hours - all regular time
          correctRegularHours = totalHours;
          correctOvertimeHours = 0;
        } else {
          // Beyond 8 hours - split into regular and overtime
          correctRegularHours = standardWorkHours; // 8 hours regular
          correctOvertimeHours = totalHours - standardWorkHours; // Rest is overtime
        }
      }

      // Ensure non-negative values
      correctRegularHours = Math.max(0, correctRegularHours);
      correctOvertimeHours = Math.max(0, correctOvertimeHours);

      // Round to 2 decimal places
      correctRegularHours = Math.round(correctRegularHours * 100) / 100;
      correctOvertimeHours = Math.round(correctOvertimeHours * 100) / 100;
      const correctDelayMinutesRounded = Math.round(correctDelayMinutes * 100) / 100;

      // Check if values need fixing
      const delayDiff = Math.abs((record.delay_minutes || 0) - correctDelayMinutesRounded);
      const regularDiff = Math.abs(record.regular_hours - correctRegularHours);
      const overtimeDiff = Math.abs(record.overtime_hours - correctOvertimeHours);

      if (delayDiff > 0.1 || regularDiff > 0.1 || overtimeDiff > 0.1) {
        fixes.push({
          id: record.id,
          userName: record.users?.name,
          shiftName: shift.name,
          workDate: record.work_date,
          oldValues: {
            delay_minutes: record.delay_minutes || 0,
            regular_hours: record.regular_hours,
            overtime_hours: record.overtime_hours
          },
          newValues: {
            delay_minutes: correctDelayMinutesRounded,
            regular_hours: correctRegularHours,
            overtime_hours: correctOvertimeHours
          }
        });
        recordsFixed++;
      }
    }

    if (fixes.length === 0) {
      console.log('✅ All monthly shift calculations are correct!');
      return { success: true, recordsFixed: 0, message: 'All calculations verified as correct' };
    }

    // Apply fixes
    console.log(`🔧 Applying fixes to ${fixes.length} records...`);
    
    for (const fix of fixes) {
      const { error: updateError } = await supabase
        .from('monthly_shifts')
        .update({
          delay_minutes: fix.newValues.delay_minutes,
          regular_hours: fix.newValues.regular_hours,
          overtime_hours: fix.newValues.overtime_hours,
          updated_at: new Date().toISOString()
        })
        .eq('id', fix.id);

      if (updateError) {
        console.error(`❌ Failed to update record ${fix.id}:`, updateError);
      } else {
        console.log(`✅ Fixed ${fix.userName} (${fix.shiftName}) - ${fix.workDate}`);
        console.log(`   Delay: ${fix.oldValues.delay_minutes}min → ${fix.newValues.delay_minutes}min`);
        console.log(`   Regular: ${fix.oldValues.regular_hours}h → ${fix.newValues.regular_hours}h`);
        console.log(`   Overtime: ${fix.oldValues.overtime_hours}h → ${fix.newValues.overtime_hours}h`);
      }
    }

    console.log(`🎉 Successfully fixed ${recordsFixed} monthly shift records!`);
    return { 
      success: true, 
      recordsFixed, 
      fixes,
      message: `Fixed ${recordsFixed} records with calculation errors` 
    };

  } catch (error) {
    console.error('❌ Error verifying monthly shifts:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Quick verification function for current month
 */
export async function verifyCurrentMonthShifts() {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  
  console.log(`🔍 Verifying current month (${currentMonth}) shift calculations...`);
  
  try {
    const { data: monthlyShifts, error } = await supabase
      .from('monthly_shifts')
      .select(`
        *,
        shifts:shift_id(name, start_time, end_time),
        users:user_id(name, position)
      `)
      .gte('work_date', `${currentMonth}-01`)
      .lt('work_date', `${currentMonth}-32`)
      .not('check_in_time', 'is', null)
      .not('check_out_time', 'is', null);

    if (error) throw error;

    console.log(`📊 Found ${monthlyShifts.length} records for current month`);
    
    // Quick validation
    let issuesFound = 0;
    for (const record of monthlyShifts) {
      if (!record.shifts) continue;
      
      const totalRecorded = record.regular_hours + record.overtime_hours;
      const checkInTime = new Date(record.check_in_time);
      const checkOutTime = new Date(record.check_out_time);
      const actualTotal = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      if (Math.abs(totalRecorded - actualTotal) > 0.2) {
        console.warn(`⚠️ ${record.users?.name}: Recorded ${totalRecorded}h vs Actual ${actualTotal.toFixed(2)}h`);
        issuesFound++;
      }
    }

    if (issuesFound === 0) {
      console.log('✅ Current month calculations look good!');
    } else {
      console.log(`⚠️ Found ${issuesFound} potential issues in current month`);
    }

    return { success: true, recordsChecked: monthlyShifts.length, issuesFound };

  } catch (error) {
    console.error('❌ Error verifying current month:', error);
    return { success: false, error: error.message };
  }
} 