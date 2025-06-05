// Debug Shift Tracking Issues
// Run this in browser console to check why shift tracking is unavailable

(async function debugShiftTracking() {
  console.log('🔍 Debugging shift tracking system...');
  
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase not found. Make sure you are on the Noorcare app page.');
    return;
  }
  
  try {
    // 1. Check current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Auth error or no user logged in');
      return;
    }
    
    console.log('👤 Current user ID:', user.id);
    
    // 2. Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, position')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.error('❌ Error fetching user data:', userError);
      return;
    }
    
    console.log('📝 User name:', userData.name);
    console.log('💼 User position:', userData.position);
    console.log('🏷️ User role:', userData.role);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log('📅 Today:', today);
    
    // 3. Check if shifts table exists and has data
    console.log('\n🔍 Checking shifts table...');
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .eq('position', userData.position || 'Customer Service');
    
    if (shiftsError) {
      console.error('❌ Error fetching shifts:', shiftsError);
      console.log('💡 The shifts table might not exist or have RLS issues');
    } else {
      console.log('✅ Available shifts:', shifts?.length || 0);
      shifts?.forEach(shift => {
        console.log(`   • ${shift.name}: ${shift.start_time} - ${shift.end_time}`);
      });
    }
    
    // 4. Check if shift_assignments table exists
    console.log('\n🔍 Checking shift assignments for today...');
    const { data: assignment, error: assignmentError } = await supabase
      .from('shift_assignments')
      .select(`
        *,
        shifts:assigned_shift_id(name, start_time, end_time)
      `)
      .eq('employee_id', user.id)
      .eq('work_date', today)
      .single();
    
    if (assignmentError) {
      if (assignmentError.code === 'PGRST116') {
        console.log('⚠️ No shift assignment found for today');
        console.log('💡 This is why shift tracking is unavailable');
      } else {
        console.error('❌ Error fetching shift assignment:', assignmentError);
        console.log('💡 The shift_assignments table might not exist or have RLS issues');
      }
    } else {
      console.log('✅ Shift assignment found:', assignment);
      if (assignment.is_day_off) {
        console.log('🏖️ Today is marked as a day off');
      } else if (assignment.shifts) {
        console.log(`📋 Assigned shift: ${assignment.shifts.name} (${assignment.shifts.start_time} - ${assignment.shifts.end_time})`);
      }
    }
    
    // 5. Check monthly_shifts table
    console.log('\n🔍 Checking monthly_shifts table...');
    const { data: monthlyShift, error: monthlyError } = await supabase
      .from('monthly_shifts')
      .select(`
        *,
        shifts:shift_id(name, start_time, end_time)
      `)
      .eq('user_id', user.id)
      .eq('work_date', today)
      .single();
    
    if (monthlyError) {
      if (monthlyError.code === 'PGRST116') {
        console.log('⚠️ No monthly shift record found for today');
      } else {
        console.error('❌ Error fetching monthly shift:', monthlyError);
      }
    } else {
      console.log('✅ Monthly shift record found:', monthlyShift);
      console.log(`   Check-in: ${monthlyShift.check_in_time || 'Not checked in'}`);
      console.log(`   Check-out: ${monthlyShift.check_out_time || 'Not checked out'}`);
      console.log(`   Regular hours: ${monthlyShift.regular_hours || 0}h`);
      console.log(`   Overtime hours: ${monthlyShift.overtime_hours || 0}h`);
    }
    
    // 6. Check recent check-ins
    console.log('\n🔍 Checking recent check-ins...');
    const { data: checkIns, error: checkInError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id)
      .gte('check_in_time', today + 'T00:00:00')
      .order('check_in_time', { ascending: false })
      .limit(3);
    
    if (checkInError) {
      console.error('❌ Error fetching check-ins:', checkInError);
    } else {
      console.log('📋 Recent check-ins:', checkIns?.length || 0);
      checkIns?.forEach((checkIn, index) => {
        console.log(`   ${index + 1}. ${checkIn.check_in_time} - ${checkIn.check_out_time || 'Not checked out'}`);
      });
    }
    
    // 7. Summary and recommendations
    console.log('\n📊 DIAGNOSIS:');
    
    if (shiftsError) {
      console.log('❌ ISSUE: Cannot access shifts table');
      console.log('🔧 SOLUTION: Check RLS policies for shifts table or create shifts');
    }
    
    if (assignmentError && assignmentError.code !== 'PGRST116') {
      console.log('❌ ISSUE: Cannot access shift_assignments table');
      console.log('🔧 SOLUTION: Check if shift_assignments table exists and has correct RLS policies');
    } else if (assignmentError?.code === 'PGRST116') {
      console.log('⚠️ ISSUE: No shift assigned for today');
      console.log('🔧 SOLUTION: Admin needs to assign a shift for today in Shift Management');
    }
    
    if (monthlyError && monthlyError.code !== 'PGRST116') {
      console.log('❌ ISSUE: Cannot access monthly_shifts table');
      console.log('🔧 SOLUTION: Check RLS policies for monthly_shifts table');
    }
    
    // 8. Quick fix suggestions
    console.log('\n🔧 QUICK FIXES:');
    console.log('1. Run the shift assignment SQL scripts to create missing tables');
    console.log('2. Admin should assign shifts in the Shift Management page');
    console.log('3. Check if RLS policies allow employees to read their shift data');
    
    if (!assignmentError || assignmentError.code === 'PGRST116') {
      console.log('\n💡 MOST LIKELY CAUSE: No shift assigned for today');
      console.log('   • Go to Admin → Shift Management');
      console.log('   • Assign a Day Shift or Night Shift for today');
      console.log('   • This will enable proper shift tracking');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
})(); 