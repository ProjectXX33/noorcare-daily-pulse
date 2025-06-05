// Check Current Performance Records
// Run this in browser console to see your 2 records in detail

async function checkCurrentRecords() {
  console.log('🔍 Checking current performance records...');
  
  try {
    // Get current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Fetch all records for current month
    const { data: records, error } = await supabase
      .from('admin_performance_dashboard')
      .select(`
        *,
        users:employee_id(position)
      `)
      .eq('month_year', currentMonth)
      .order('average_performance_score', { ascending: false });

    if (error) {
      console.error('❌ Error fetching records:', error);
      return;
    }

    console.log(`📊 Found ${records.length} records for ${currentMonth}:`);
    console.log('═'.repeat(80));

    records.forEach((record, index) => {
      console.log(`\n📋 Record ${index + 1}: ${record.employee_name}`);
      console.log(`   Position: ${record.users?.position || 'Unknown'}`);
      console.log(`   Working Days: ${record.total_working_days}`);
      console.log(`   Delay Minutes: ${record.total_delay_minutes}`);
      console.log(`   Delay Hours: ${record.total_delay_hours}h`);
      console.log(`   Overtime Hours: ${record.total_overtime_hours}h`);
      console.log(`   Performance Score: ${record.average_performance_score}%`);
      console.log(`   Punctuality: ${record.punctuality_percentage}%`);
      console.log(`   Status: ${record.performance_status}`);
      
      // Verify calculations
      const calculatedScore = record.total_delay_minutes <= 0 ? 100 : 
        record.total_delay_minutes >= 500 ? 0 : 
        Math.max(0, 100 - (record.total_delay_minutes / 5));
      
      const calculatedPunctuality = record.total_delay_minutes >= 60 ? 0 :
        record.total_delay_minutes > 30 ? Math.max(0, 50 - (record.total_delay_minutes * 2)) :
        record.total_delay_minutes > 0 ? Math.max(0, 90 - (record.total_delay_minutes * 3)) : 100;
      
      console.log(`   ✓ Calculated Score: ${calculatedScore.toFixed(1)}% ${calculatedScore.toFixed(1) == record.average_performance_score.toFixed(1) ? '✅' : '❌'}`);
      console.log(`   ✓ Calculated Punctuality: ${calculatedPunctuality.toFixed(1)}% ${calculatedPunctuality.toFixed(1) == record.punctuality_percentage.toFixed(1) ? '✅' : '❌'}`);
      console.log('   ' + '─'.repeat(50));
    });

    // Summary
    const totalDelayHours = records.reduce((sum, r) => sum + r.total_delay_hours, 0);
    const totalOvertimeHours = records.reduce((sum, r) => sum + r.total_overtime_hours, 0);
    const avgPerformance = records.reduce((sum, r) => sum + r.average_performance_score, 0) / records.length;

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Employees: ${records.length}`);
    console.log(`   Total Delay Hours: ${totalDelayHours.toFixed(1)}h`);
    console.log(`   Total Overtime Hours: ${totalOvertimeHours.toFixed(1)}h`);
    console.log(`   Average Performance: ${avgPerformance.toFixed(1)}%`);
    
    return records;

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Make function available globally
window.checkCurrentRecords = checkCurrentRecords;

console.log('🚀 Function loaded! Run: checkCurrentRecords()'); 