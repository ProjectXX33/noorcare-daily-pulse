// Test script to verify working days calculation fix
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://lqgwefbscqtbsrmfqhsf.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZ3dlZmJzY3F0YnNybWZxaHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMjQyNTgsImV4cCI6MjA0NzYwMDI1OH0.2XBHmlGDN3Rr6t6X6a-bUMGhQR3yb9FCk2sXBkiO4Yo'
)

async function testWorkingDaysCalculation() {
  console.log('🧪 Testing working days calculation...')
  
  try {
    // Get a sample employee
    const { data: employees, error: empError } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'employee')
      .limit(1)
    
    if (empError || !employees || employees.length === 0) {
      console.log('❌ No employees found for testing')
      return
    }
    
    const employee = employees[0]
    console.log(`👤 Testing with employee: ${employee.name}`)
    
    // Check current performance record
    const currentMonth = new Date().toISOString().substr(0, 7) // YYYY-MM format
    const { data: perfRecord, error: perfError } = await supabase
      .from('admin_performance_dashboard')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('month_year', currentMonth)
      .single()
    
    if (perfError && perfError.code !== 'PGRST116') {
      console.error('❌ Error fetching performance record:', perfError)
      return
    }
    
    if (perfRecord) {
      console.log('📊 Current performance record:')
      console.log(`   Working days: ${perfRecord.total_working_days}`)
      console.log(`   Worked dates: ${perfRecord.worked_dates || 'Not set'}`)
      console.log(`   Total overtime: ${perfRecord.total_overtime_hours}h`)
      console.log(`   Performance score: ${perfRecord.average_performance_score}%`)
    } else {
      console.log('📭 No performance record found for current month')
    }
    
    // Check recent check-ins for this employee
    const { data: checkIns, error: checkError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', employee.id)
      .gte('timestamp', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .order('timestamp', { ascending: false })
    
    if (checkError) {
      console.error('❌ Error fetching check-ins:', checkError)
      return
    }
    
    console.log(`\n📅 Recent check-ins this month: ${checkIns?.length || 0}`)
    
    if (checkIns && checkIns.length > 0) {
      const completedCheckIns = checkIns.filter(ci => ci.checkout_time)
      console.log(`✅ Completed check-ins (with checkout): ${completedCheckIns.length}`)
      
      const uniqueDates = new Set(
        completedCheckIns.map(ci => 
          new Date(ci.timestamp).toISOString().split('T')[0]
        )
      )
      console.log(`📆 Unique working dates: ${uniqueDates.size}`)
      console.log(`   Dates: ${Array.from(uniqueDates).join(', ')}`)
      
      if (perfRecord && perfRecord.total_working_days !== uniqueDates.size) {
        console.log(`\n⚠️  DISCREPANCY DETECTED!`)
        console.log(`   Performance record shows: ${perfRecord.total_working_days} working days`)
        console.log(`   Actual unique dates worked: ${uniqueDates.size}`)
        console.log(`   Expected: These should match!`)
      } else {
        console.log(`\n✅ Working days calculation looks correct!`)
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testWorkingDaysCalculation()
  .then(() => {
    console.log('\n🏁 Test completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Test error:', error)
    process.exit(1)
  }) 