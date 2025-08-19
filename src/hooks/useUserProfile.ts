
import { User } from '../types';
import { supabase } from '@/lib/supabase';

// Function to fetch user profile data
export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  try {
    console.log('Fetching user profile for ID:', userId);
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    if (!userData) {
      console.error('No user data found for ID:', userId);
      return null;
    }
    
    console.log('User profile data retrieved:', userData);
    
    // Transform from database format to app format
    const appUser: User = {
      id: userData.id,
      username: userData.username,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      department: userData.department,
      position: userData.position,
      team: userData.team,
      lastCheckin: userData.last_checkin ? new Date(userData.last_checkin) : undefined
    };
    
    return appUser;
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    return null;
  }
};
