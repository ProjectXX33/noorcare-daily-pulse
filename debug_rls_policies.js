// Debug RLS Policies and User Access
// Run this in browser console to check admin access and RLS policies

(async function debugAccess() {
  console.log('🔍 Debugging database access and RLS policies...');
  
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase not found. Make sure you are on the Noorcare app page.');
    return;
  }
  
  try {
    // 1. Check current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }
    
    console.log('👤 Current user ID:', user.id);
    console.log('📧 Current user email:', user.email);
    
    // 2. Check user role in database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, position')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.error('❌ Error fetching user data:', userError);
      return;
    }
    
    console.log('🏷️ User role:', userData.role);
    console.log('💼 User position:', userData.position);
    console.log('📝 User name:', userData.name);
    
    if (userData.role !== 'admin') {
      console.error('❌ User is not an admin! Current role:', userData.role);
      console.log('💡 You need admin role to manage performance dashboard.');
      return;
    }
    
    console.log('✅ User has admin role');
    
    // 3. Test read access to performance dashboard
    console.log('\n🔍 Testing read access...');
    const { data: readTest, error: readError } = await supabase
      .from('admin_performance_dashboard')
      .select('id, employee_name')
      .limit(1);
    
    if (readError) {
      console.error('❌ Read access failed:', readError);
    } else {
      console.log('✅ Read access works. Records found:', readTest?.length || 0);
    }
    
    // 4. Test insert access (with dummy data)
    console.log('\n🔍 Testing insert access with dummy data...');
    const dummyData = {
      employee_id: userData.id, // Use current user as test
      employee_name: 'Test User',
      month_year: '2099-12', // Far future month to avoid conflicts
      total_working_days: 1,
      total_delay_minutes: 0,
      total_delay_hours: 0,
      total_overtime_hours: 0,
      average_performance_score: 100,
      punctuality_percentage: 100,
      performance_status: 'Excellent'
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('admin_performance_dashboard')
      .insert([dummyData])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert access failed:', insertError);
      
      if (insertError.code === 'PGRST301') {
        console.log('💡 This is likely an RLS policy issue. Run the fix_performance_dashboard_rls.sql script in Supabase.');
      }
    } else {
      console.log('✅ Insert access works');
      
      // Clean up test record
      await supabase
        .from('admin_performance_dashboard')
        .delete()
        .eq('id', insertTest.id);
      
      console.log('🗑️ Test record cleaned up');
    }
    
    // 5. Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Read Access: ${readError ? '❌ FAILED' : '✅ OK'}`);
    console.log(`   Insert Access: ${insertError ? '❌ FAILED' : '✅ OK'}`);
    
    if (insertError) {
      console.log('\n🔧 SOLUTION:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Run the fix_performance_dashboard_rls.sql script');
      console.log('3. This will fix the RLS policies for admin access');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
})(); 