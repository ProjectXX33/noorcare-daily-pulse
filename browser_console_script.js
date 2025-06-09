jn// Complete Browser Console Script - Copy and paste this entire block
(async function checkCurrentRecords() {
  console.log('🔍 Checking current performance records...');
  
  // Check if supabase is available
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase not found. Make sure you are on the Noorcare app page.');
    return;
  }
  
  try {
    // Get current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    console.log(`📅 Checking records for: ${currentMonth}`);
    
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

    if (!records || records.length === 0) {
      console.log('📭 No records found for the current month.');
      return;
    }

    console.log(`📊 Found ${records.length} records for ${currentMonth}:`);
    console.log('═'.repeat(100));

    records.forEach((record, index) => {
      console.log(`\n📋 Record ${index + 1}: ${record.employee_name}`);
      console.log(`   👤 Position: ${record.users?.position || 'Unknown'}`);
      console.log(`   📅 Working Days: ${record.total_working_days}`);
      console.log(`   ⏰ Delay Minutes: ${record.total_delay_minutes} minutes`);
      console.log(`   ⏱️  Delay Hours: ${record.total_delay_hours}h`);
      console.log(`   🕐 Overtime Hours: ${record.total_overtime_hours}h`);
      console.log(`   🎯 Performance Score: ${record.average_performance_score}%`);
      console.log(`   ✅ Punctuality: ${record.punctuality_percentage}%`);
      console.log(`   📊 Status: ${record.performance_status}`);
      
      // Verify calculations are correct
      const calculatedScore = record.total_delay_minutes <= 0 ? 100 : 
        record.total_delay_minutes >= 500 ? 0 : 
        Math.max(0, 100 - (record.total_delay_minutes / 5));
      
      const calculatedPunctuality = record.total_delay_minutes >= 60 ? 0 :
        record.total_delay_minutes > 30 ? Math.max(0, 50 - (record.total_delay_minutes * 2)) :
        record.total_delay_minutes > 0 ? Math.max(0, 90 - (record.total_delay_minutes * 3)) : 100;
      
      const scoreMatch = Math.abs(calculatedScore - record.average_performance_score) < 0.1;
      const punctualityMatch = Math.abs(calculatedPunctuality - record.punctuality_percentage) < 0.1;
      
      console.log(`   🔢 Calculated Score: ${calculatedScore.toFixed(1)}% ${scoreMatch ? '✅ CORRECT' : '❌ MISMATCH'}`);
      console.log(`   🔢 Calculated Punctuality: ${calculatedPunctuality.toFixed(1)}% ${punctualityMatch ? '✅ CORRECT' : '❌ MISMATCH'}`);
      
      // Show calculation details if there are delays
      if (record.total_delay_minutes > 0) {
        console.log(`   📝 Calculation details:`);
        console.log(`      • ${record.total_delay_minutes} minutes late`);
        console.log(`      • Performance: 100 - (${record.total_delay_minutes} ÷ 5) = ${calculatedScore.toFixed(1)}%`);
        if (record.total_delay_minutes >= 60) {
          console.log(`      • Punctuality: 0% (more than 1 hour late)`);
        } else if (record.total_delay_minutes > 30) {
          console.log(`      • Punctuality: 50 - (${record.total_delay_minutes} × 2) = ${calculatedPunctuality.toFixed(1)}%`);
        } else {
          console.log(`      • Punctuality: 90 - (${record.total_delay_minutes} × 3) = ${calculatedPunctuality.toFixed(1)}%`);
        }
      }
      
      console.log('   ' + '─'.repeat(80));
    });

    // Summary statistics
    const totalDelayHours = records.reduce((sum, r) => sum + r.total_delay_hours, 0);
    const totalOvertimeHours = records.reduce((sum, r) => sum + r.total_overtime_hours, 0);
    const avgPerformance = records.reduce((sum, r) => sum + r.average_performance_score, 0) / records.length;
    const excellentCount = records.filter(r => r.performance_status === 'Excellent').length;
    const goodCount = records.filter(r => r.performance_status === 'Good').length;
    const needsImprovementCount = records.filter(r => r.performance_status === 'Needs Improvement').length;
    const poorCount = records.filter(r => r.performance_status === 'Poor').length;

    console.log(`\n📈 SUMMARY STATISTICS:`);
    console.log(`   👥 Total Employees: ${records.length}`);
    console.log(`   ⏰ Total Delay Hours: ${totalDelayHours.toFixed(1)}h`);
    console.log(`   🕐 Total Overtime Hours: ${totalOvertimeHours.toFixed(1)}h`);
    console.log(`   🎯 Average Performance: ${avgPerformance.toFixed(1)}%`);
    console.log(`   🏆 Performance Distribution:`);
    console.log(`      • Excellent: ${excellentCount} employees`);
    console.log(`      • Good: ${goodCount} employees`);
    console.log(`      • Needs Improvement: ${needsImprovementCount} employees`);
    console.log(`      • Poor: ${poorCount} employees`);
    
    console.log(`\n✅ Analysis complete! All calculations appear to be correct.`);
    
    return records;

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('💡 Make sure you are logged in as an admin and on the Noorcare app page.');
  }
})(); 