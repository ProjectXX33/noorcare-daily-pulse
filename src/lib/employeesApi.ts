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
      lastCheckin: user.last_checkin ? new Date(user.last_checkin) : undefined,
      diamondRank: user.diamond_rank || false,
      diamondRankAssignedBy: user.diamond_rank_assigned_by,
      diamondRankAssignedAt: user.diamond_rank_assigned_at ? new Date(user.diamond_rank_assigned_at) : undefined
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

export async function resetEmployeePassword(email: string, newPassword?: string): Promise<void> {
  try {
    if (newPassword) {
      // Admin direct password reset using RPC function
      console.log(`🔐 Attempting to reset password for: ${email}`);
      
      // Try the improved RPC function first
      const { data, error } = await supabase.rpc('simple_admin_password_reset_v2', {
        target_email: email,
        new_password: newPassword
      });
      
      if (error) {
        console.error('V2 RPC error:', error);
        // Fallback to improved complex function
        try {
          const { data: improvedData, error: improvedError } = await supabase.rpc('admin_reset_password_improved', {
            target_email: email,
            new_password: newPassword
          });
          
          if (improvedError) {
            console.error('Improved RPC error:', improvedError);
            // Fallback to original functions
            try {
              const { data: originalData, error: originalError } = await supabase.rpc('admin_update_user_password', {
                user_email: email,
                new_password: newPassword
              });
              
              if (originalError) {
                console.error('Original RPC error:', originalError);
                throw new Error(`All RPC methods failed. Last error: ${originalError.message}`);
              } else {
                console.log(`✅ Password updated via original RPC for: ${email}`);
              }
            } catch (originalError) {
              throw originalError;
            }
          } else {
            console.log(`✅ Password updated via improved RPC for: ${email} - Result:`, improvedData);
          }
        } catch (fallbackError) {
          throw fallbackError;
        }
      } else {
        // Check if the result indicates success
        if (data && data.success) {
          console.log(`✅ Password updated via V2 RPC for: ${email} - Result:`, data);
        } else {
          console.log(`⚠️ V2 RPC returned false/error for: ${email} - Result:`, data);
          // Try the improved function as fallback
          const { data: improvedData, error: improvedError } = await supabase.rpc('admin_reset_password_improved', {
            target_email: email,
            new_password: newPassword
          });
          
          if (improvedError || !improvedData?.success) {
            throw new Error(`Password reset failed. User may not exist in auth system. Email: ${email}`);
          } else {
            console.log(`✅ Password updated via improved fallback for: ${email} - Result:`, improvedData);
          }
        }
      }
    } else {
      // Fallback to email reset if no password provided
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      
      if (error) throw error;
      
      console.log(`📧 Password reset email sent to: ${email}`);
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}

// Diamond Rank Functions
export async function assignDiamondRank(employeeId: string, adminId: string): Promise<void> {
  try {
    console.log(`💎 Assigning Diamond rank to employee: ${employeeId} by admin: ${adminId}`);
    
    const { data, error } = await supabase.rpc('assign_diamond_rank', {
      target_employee_id: employeeId,
      admin_id: adminId
    });

    if (error) {
      console.error('Error assigning Diamond rank:', error);
      throw error;
    }

    // Send notification
    await supabase.rpc('notify_diamond_rank_assignment', {
      employee_id: employeeId,
      admin_id: adminId,
      action: 'assigned'
    });

    console.log('✅ Diamond rank assigned successfully');
  } catch (error) {
    console.error('Error assigning Diamond rank:', error);
    throw error;
  }
}

export async function removeDiamondRank(employeeId: string, adminId: string): Promise<void> {
  try {
    console.log(`💎 Removing Diamond rank from employee: ${employeeId} by admin: ${adminId}`);
    
    const { data, error } = await supabase.rpc('remove_diamond_rank', {
      target_employee_id: employeeId,
      admin_id: adminId
    });

    if (error) {
      console.error('Error removing Diamond rank:', error);
      throw error;
    }

    // Send notification
    await supabase.rpc('notify_diamond_rank_assignment', {
      employee_id: employeeId,
      admin_id: adminId,
      action: 'removed'
    });

    console.log('✅ Diamond rank removed successfully');
  } catch (error) {
    console.error('Error removing Diamond rank:', error);
    throw error;
  }
}

export async function getDiamondEmployees(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('diamond_employees')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching Diamond employees:', error);
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
