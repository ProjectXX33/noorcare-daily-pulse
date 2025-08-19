import { supabase } from '@/lib/supabase';
import { TeamRecord, ManagerRoleRecord, TeamMember, TeamManagerInfo, TeamAssignmentAudit } from '@/types';

// Team Management Functions
export async function fetchTeams(): Promise<TeamRecord[]> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('is_active', true)
      .order('name');
      
    if (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching teams:', error);
    throw error;
  }
}

export async function fetchManagerRoles(): Promise<ManagerRoleRecord[]> {
  try {
    const { data, error } = await supabase
      .from('manager_roles')
      .select('*')
      .eq('is_active', true)
      .order('display_name');
      
    if (error) {
      console.error('Error fetching manager roles:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching manager roles:', error);
    throw error;
  }
}

export async function getTeamMembers(teamName: string): Promise<TeamMember[]> {
  try {
    const { data, error } = await supabase.rpc('get_team_members', {
      team_name: teamName
    });
      
    if (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
}

export async function getTeamManager(teamName: string): Promise<TeamManagerInfo | null> {
  try {
    const { data, error } = await supabase.rpc('get_team_manager', {
      team_name: teamName
    });
      
    if (error) {
      console.error('Error fetching team manager:', error);
      throw error;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error fetching team manager:', error);
    throw error;
  }
}

export async function assignUserToTeam(userId: string, teamName: string, reason?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ team: teamName })
      .eq('id', userId);
      
    if (error) {
      console.error('Error assigning user to team:', error);
      throw error;
    }
    
    console.log(`✅ User ${userId} assigned to team ${teamName}`);
  } catch (error) {
    console.error('Error assigning user to team:', error);
    throw error;
  }
}

export async function removeUserFromTeam(userId: string, reason?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ team: null })
      .eq('id', userId);
      
    if (error) {
      console.error('Error removing user from team:', error);
      throw error;
    }
    
    console.log(`✅ User ${userId} removed from team`);
  } catch (error) {
    console.error('Error removing user from team:', error);
    throw error;
  }
}

export async function getTeamAssignmentAudit(userId?: string): Promise<TeamAssignmentAudit[]> {
  try {
    let query = supabase
      .from('team_assignments_audit')
      .select('*')
      .order('assigned_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error('Error fetching team assignment audit:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching team assignment audit:', error);
    throw error;
  }
}

// Team Analytics Functions
export async function getTeamStats(teamName: string): Promise<{
  totalMembers: number;
  activeToday: number;
  pendingTasks: number;
  completedTasks: number;
}> {
  try {
    // Get team members count
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id')
      .eq('team', teamName)
      .not('name', 'like', '[DEACTIVATED]%');
    
    if (membersError) throw membersError;
    
    const totalMembers = members?.length || 0;
    
    // You can extend this with more analytics queries
    // For now, returning basic structure
    return {
      totalMembers,
      activeToday: 0, // Would need to implement activity tracking
      pendingTasks: 0, // Would need to query tasks table
      completedTasks: 0 // Would need to query tasks table
    };
  } catch (error) {
    console.error('Error fetching team stats:', error);
    throw error;
  }
}

// Helper function to get available teams for dropdowns
export async function getAvailableTeams(): Promise<Array<{ value: string; label: string }>> {
  try {
    const teams = await fetchTeams();
    return teams.map(team => ({
      value: team.name,
      label: team.name
    }));
  } catch (error) {
    console.error('Error fetching available teams:', error);
    return [
      { value: 'Content & Creative Department', label: 'Content & Creative Department' },
      { value: 'Customer Retention Department', label: 'Customer Retention Department' },
      { value: 'IT Department', label: 'IT Department' }
    ];
  }
}

// Helper function to get role display name
export function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    'admin': 'Executive Director',
    'employee': 'Employee',
    'warehouse': 'Warehouse',
    'content_creative_manager': 'Content & Creative Manager',
    'customer_retention_manager': 'Customer Retention Manager',
    'digital_solution_manager': 'Digital Solution Department Manager'
  };
  
  return roleMap[role] || role;
}

// Helper function to get team badge color
export function getTeamBadgeColor(teamName: string): string {
  const colorMap: Record<string, string> = {
    'Content & Creative Department': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Customer Retention Department': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'IT Department': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  };
  
  return colorMap[teamName] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
}
