// Debug Task Creation Script
// Run this in the browser console to test task creation step by step

console.log('=== Debug Task Creation ===');

// Step 1: Check if user is authenticated
const checkAuth = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    console.log('✅ Authenticated user:', user?.id, user?.email);
    return user;
  } catch (error) {
    console.error('❌ Auth error:', error);
    return null;
  }
};

// Step 2: Check if we can fetch users for assignment
const checkUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('role', 'employee');
    
    if (error) throw error;
    
    console.log('✅ Available employees:', data);
    return data;
  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    return [];
  }
};

// Step 3: Test basic task insertion
const testTaskInsertion = async (user, employees) => {
  if (!user || employees.length === 0) {
    console.error('❌ Missing user or employees for test');
    return;
  }
  
  const testTask = {
    title: 'Debug Test Task',
    description: 'Testing task creation from console',
    assigned_to: employees[0].id,
    status: 'Not Started',
    progress_percentage: 0,
    created_by: user.id
  };
  
  console.log('🧪 Testing task insertion with data:', testTask);
  
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([testTask])
      .select('*')
      .single();
    
    if (error) throw error;
    
    console.log('✅ Task created successfully:', data);
    
    // Clean up
    await supabase.from('tasks').delete().eq('id', data.id);
    console.log('🧹 Test task cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ Task creation failed:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    return false;
  }
};

// Step 4: Test the API function
const testCreateTaskAPI = async (user, employees) => {
  if (!user || employees.length === 0) {
    console.error('❌ Missing user or employees for API test');
    return;
  }
  
  const taskData = {
    title: 'API Test Task',
    description: 'Testing task creation via API',
    assignedTo: employees[0].id,
    status: 'Not Started',
    progressPercentage: 0,
    createdBy: user.id
  };
  
  console.log('🧪 Testing createTask API with data:', taskData);
  
  try {
    // This would be: const task = await createTask(taskData);
    // But we'll simulate it here
    console.log('API test would call createTask() function');
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error);
    return false;
  }
};

// Run all tests
const runDebugTests = async () => {
  console.log('Starting debug tests...');
  
  const user = await checkAuth();
  const employees = await checkUsers();
  
  if (user && employees.length > 0) {
    await testTaskInsertion(user, employees);
    await testCreateTaskAPI(user, employees);
  }
  
  console.log('Debug tests completed!');
};

// Auto-run if supabase is available
if (typeof supabase !== 'undefined') {
  runDebugTests();
} else {
  console.log('❌ Supabase not available. Run this in the app context.');
} 