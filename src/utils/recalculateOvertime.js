import { supabase } from '@/lib/supabase';

// Function to recalculate overtime hours for existing records
export async function recalculateOvertimeHours() {
  console.log('🔄 Starting overtime recalculation for all monthly_shifts records...');
  
  try {
    // Fetch all monthly_shifts records with their related shift data
    const { data: monthlyShifts, error: fetchError } = await supabase
      .from('monthly_shifts')
      .select(`
        id,
        user_id,
        work_date,
        check_in_time,
        check_out_time,
        regular_hours,
        overtime_hours,
        shifts:shift_id(
          id,
          name,
          start_time,
          end_time
        ),
        users:user_id(
          name
        )
      `)
      .not('check_in_time', 'is', null)
      .not('check_out_time', 'is', null)
      .order('work_date', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching monthly shifts:', fetchError);
      return { success: false, error: fetchError.message };
    }

    console.log(`📊 Found ${monthlyShifts.length} records to process...`);

    let recordsUpdated = 0;
    const updates = [];

    for (const record of monthlyShifts) {
      if (!record.shifts) {
        console.warn(`⚠️ Skipping record ${record.id} - no shift data`);
        continue;
      }

      const checkInTime = new Date(record.check_in_time);
      const checkOutTime = new Date(record.check_out_time);
      const shift = record.shifts;

      // Calculate new values using corrected logic
      const result = calculateWorkHours(checkInTime, checkOutTime, shift);
      
      // Check if values changed significantly (more than 0.1 hour difference)
      const regularDiff = Math.abs(result.regularHours - record.regular_hours);
      const overtimeDiff = Math.abs(result.overtimeHours - record.overtime_hours);
      
      if (regularDiff > 0.1 || overtimeDiff > 0.1) {
        updates.push({
          id: record.id,
          regular_hours: result.regularHours,
          overtime_hours: result.overtimeHours,
          updated_at: new Date().toISOString()
        });

        console.log(`📝 Will update ${record.users?.name} (${shift.name}) - ${record.work_date}:`);
        console.log(`   Regular: ${record.regular_hours}h → ${result.regularHours}h`);
        console.log(`   Overtime: ${record.overtime_hours}h → ${result.overtimeHours}h`);
        console.log(`   Total: ${(result.regularHours + result.overtimeHours).toFixed(1)}h`);
        
        recordsUpdated++;
      }
    }

    if (updates.length === 0) {
      console.log('✅ No records need updating - all calculations are already correct!');
      return { success: true, recordsUpdated: 0, message: 'All records already correct' };
    }

    // Batch update records
    console.log(`🚀 Updating ${updates.length} records...`);
    
    const updatePromises = updates.map(update => 
      supabase
        .from('monthly_shifts')
        .update({
          regular_hours: update.regular_hours,
          overtime_hours: update.overtime_hours,
          updated_at: update.updated_at
        })
        .eq('id', update.id)
    );

    const results = await Promise.all(updatePromises);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('❌ Some updates failed:', errors);
      return { 
        success: false, 
        error: `${errors.length} updates failed`,
        recordsUpdated: results.length - errors.length 
      };
    }

    console.log(`✅ Successfully updated ${recordsUpdated} records!`);
    
    // Show summary of high overtime records
    const highOvertimeRecords = monthlyShifts
      .filter(r => r.overtime_hours > 8)
      .sort((a, b) => b.overtime_hours - a.overtime_hours)
      .slice(0, 10);
      
    if (highOvertimeRecords.length > 0) {
      console.log('\n🔥 Records with high overtime (>8 hours):');
      highOvertimeRecords.forEach(record => {
        const total = record.regular_hours + record.overtime_hours;
        console.log(`   ${record.users?.name} (${record.shifts?.name}) - ${record.work_date}: ${record.regular_hours}h regular + ${record.overtime_hours}h overtime = ${total.toFixed(1)}h total`);
      });
    }

    return { 
      success: true, 
      recordsUpdated, 
      message: `Successfully recalculated ${recordsUpdated} records` 
    };

  } catch (error) {
    console.error('❌ Error during recalculation:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to calculate work hours (same logic as in shiftsApi.ts)
function calculateWorkHours(checkInTime, checkOutTime, shift) {
  const totalMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60);
  const totalHours = totalMinutes / 60;
  
  // Updated standard work hours based on new shift requirements:
  // Day shift: 7 hours, Night shift: 8 hours
  let standardWorkHours = 8; // Default to 8 hours for night shift
  const shiftNameLower = (shift.name || '').toLowerCase();
  if (shiftNameLower === 'day shift' || shiftNameLower === 'day') {
    standardWorkHours = 7; // Day shift is 7 hours
  } else if (shiftNameLower === 'night shift' || shiftNameLower === 'night') {
    standardWorkHours = 8; // Night shift is 8 hours
  }
  
  // Calculate regular hours based on standard hours for the shift
  const regularHours = Math.min(totalHours, standardWorkHours);
  
  // Calculate overtime hours: total hours - standard hours for this shift
  const overtimeHours = Math.max(0, totalHours - standardWorkHours);
  
  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100
  };
}

// Helper function to run recalculation from browser console
window.recalculateOvertime = recalculateOvertimeHours; 