// Modified Verification Script - Handles Supabase Import Issues
// Run this in browser console on your Noorcare app page

(async function verifyCheckInOutRecording() {
  console.log('🔍 Verifying check-in/check-out recording and performance submission...');
  
  // Try to find Supabase in different ways
  let supabaseClient = null;
  
  // Method 1: Check for global supabase
  if (typeof supabase !== 'undefined') {
    supabaseClient = supabase;
    console.log('✅ Found global supabase');
  }
  
  // Method 2: Check for supabase in window
  else if (typeof window !== 'undefined' && window.supabase) {
    supabaseClient = window.supabase;
    console.log('✅ Found window.supabase');
  }
  
  // Method 3: Try to access from React DevTools (if using React)
  else if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('🔍 Trying to find Supabase in React components...');
    // This is more complex and might not work
  }
  
  if (!supabaseClient) {
    console.error('❌ Supabase client not found. Please make sure you are on the Noorcare app page.');
    console.log('💡 Try these steps:');
    console.log('   1. Navigate to your Noorcare app URL');
    console.log('   2. Log in to your account');
    console.log('   3. Go to the Dashboard or Check-in page');
    console.log('   4. Press F12 → Console tab');
    console.log('   5. Run this script again');
    console.log('');
    console.log('🔍 Debug info:');
    console.log('   Current URL:', window.location.href);
    console.log('   Available globals:', Object.keys(window).filter(key => key.toLowerCase().includes('supa')));
    return;
  }
  
  console.log('✅ Supabase client found, proceeding with verification...');
  
  try {
    // 1. Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Auth error or no user logged in:', authError?.message || 'No user');
      console.log('💡 Make sure you are logged in to the app');
      return;
    }
    
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id, name, email, role, position')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.error('❌ Error fetching user data:', userError);
      return;
    }
    
    console.log('👤 User:', userData.name, `(${userData.position})`);
    console.log('📧 Email:', userData.email);
    console.log('🏷️ Role:', userData.role);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    console.log('📅 Checking data for:', today);
    console.log('📊 Performance month:', currentMonth);
    
    // 2. Quick check - Can we access basic tables?
    console.log('\n🔍 Testing database access...');
    
    // Test check_ins table
    const { data: recentCheckIns, error: checkInTestError } = await supabaseClient
      .from('check_ins')
      .select('check_in_time, check_out_time')
      .eq('user_id', user.id)
      .order('check_in_time', { ascending: false })
      .limit(3);
    
    if (checkInTestError) {
      console.error('❌ Cannot access check_ins table:', checkInTestError);
    } else {
      console.log(`✅ check_ins table accessible - Found ${recentCheckIns?.length || 0} recent records`);
      if (recentCheckIns && recentCheckIns.length > 0) {
        console.log('   Most recent check-ins:');
        recentCheckIns.forEach((record, index) => {
          const checkIn = new Date(record.check_in_time).toLocaleString();
          const checkOut = record.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'Not checked out';
          console.log(`   ${index + 1}. ${checkIn} → ${checkOut}`);
        });
      }
    }
    
    // Test monthly_shifts table
    const { data: monthlyShiftsTest, error: monthlyShiftsTestError } = await supabaseClient
      .from('monthly_shifts')
      .select('work_date, regular_hours, overtime_hours')
      .eq('user_id', user.id)
      .order('work_date', { ascending: false })
      .limit(3);
    
    if (monthlyShiftsTestError) {
      console.error('❌ Cannot access monthly_shifts table:', monthlyShiftsTestError);
      console.log('💡 This means shift tracking is not set up properly');
    } else {
      console.log(`✅ monthly_shifts table accessible - Found ${monthlyShiftsTest?.length || 0} records`);
      if (monthlyShiftsTest && monthlyShiftsTest.length > 0) {
        console.log('   Recent shift records:');
        monthlyShiftsTest.forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.work_date}: ${record.regular_hours}h regular + ${record.overtime_hours}h overtime`);
        });
      }
    }
    
    // Test performance dashboard
    const { data: performanceTest, error: performanceTestError } = await supabaseClient
      .from('admin_performance_dashboard')
      .select('month_year, total_working_days, average_performance_score')
      .eq('employee_id', user.id)
      .order('month_year', { ascending: false })
      .limit(3);
    
    if (performanceTestError) {
      console.error('❌ Cannot access admin_performance_dashboard table:', performanceTestError);
      console.log('💡 Performance tracking might not be set up or you need admin access');
    } else {
      console.log(`✅ admin_performance_dashboard accessible - Found ${performanceTest?.length || 0} records`);
      if (performanceTest && performanceTest.length > 0) {
        console.log('   Recent performance records:');
        performanceTest.forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.month_year}: ${record.total_working_days} days, ${record.average_performance_score}% score`);
        });
      }
    }
    
    // Summary
    console.log('\n📊 QUICK VERIFICATION SUMMARY:');
    console.log(`   ✅ User authenticated: ${userData.name}`);
    console.log(`   ✅ Basic check-ins: ${!checkInTestError ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
    console.log(`   ✅ Shift tracking: ${!monthlyShiftsTestError ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
    console.log(`   ✅ Performance dashboard: ${!performanceTestError ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
    
    if (!checkInTestError && !monthlyShiftsTestError && !performanceTestError) {
      console.log('\n🎉 GOOD NEWS: All systems appear to be accessible!');
      console.log('   • Check-ins and check-outs should be working');
      console.log('   • Shift tracking should be operational');
      console.log('   • Performance calculations should work properly');
    } else {
      console.log('\n⚠️ ISSUES FOUND:');
      if (checkInTestError) console.log('   • Basic check-in system needs attention');
      if (monthlyShiftsTestError) console.log('   • Shift tracking system needs setup');
      if (performanceTestError) console.log('   • Performance dashboard needs configuration');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during verification:', error);
    console.log('💡 Make sure you have a stable internet connection and are logged in');
  }
})(); 