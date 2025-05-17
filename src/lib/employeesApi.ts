
import { supabase } from '@/lib/supabase';
import { User, Department, Position } from '@/types';

export async function fetchEmployees(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');
      
    if (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
    
    return data.map((user: any) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      lastCheckin: user.last_checkin ? new Date(user.last_checkin) : undefined
    }));
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

export async function createEmployee(employee: {
  username: string;
  name: string;
  email: string;
  password: string;
  department: Department;
  position: Position;
  role: 'admin' | 'employee';
}): Promise<User> {
  try {
    console.log('Creating employee with data:', { ...employee, password: '[REDACTED]' });
    
    // First, sign up the user with email and password
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: employee.email,
      password: employee.password,
      options: {
        data: {
          username: employee.username,
          name: employee.name,
          role: employee.role,
          department: employee.department,
          position: employee.position
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }
    
    if (!authData.user) {
      throw new Error('Failed to create auth user');
    }

    console.log('Auth user created successfully:', authData.user.id);
    
    // Then insert the user profile data
    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        username: employee.username,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        position: employee.position,
      }]);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    // Fetch the created user to return the complete object
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (userError) {
      console.error('Error fetching created user:', userError);
      throw userError;
    }
    
    console.log('User profile created successfully:', userData);
    
    return {
      id: userData.id,
      username: userData.username,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      department: userData.department,
      position: userData.position,
      lastCheckin: userData.last_checkin ? new Date(userData.last_checkin) : undefined
    };
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
}

export async function updateEmployee(id: string, updates: Partial<User>): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        username: updates.username,
        name: updates.name,
        email: updates.email,
        role: updates.role,
        department: updates.department,
        position: updates.position,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      username: data.username,
      name: data.name,
      email: data.email,
      role: data.role,
      department: data.department,
      position: data.position,
      lastCheckin: data.last_checkin ? new Date(data.last_checkin) : undefined
    };
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
}

export async function resetEmployeePassword(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}

// Add a subscription for real-time updates to the users table
export function subscribeToEmployeeChanges(callback: (employees: User[]) => void): () => void {
  // Initialize with current data
  fetchEmployees().then(callback).catch(console.error);
  
  // Set up the subscription
  const subscription = supabase
    .channel('public:users')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'users' }, 
      () => {
        // When there's any change, fetch the updated list
        fetchEmployees().then(callback).catch(console.error);
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}
