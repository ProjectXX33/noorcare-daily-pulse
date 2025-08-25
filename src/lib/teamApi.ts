import { supabase } from '@/lib/supabase';
import { Department, TeamMember } from '@/components/TeamTree';

export interface DatabaseTeamMember {
  id: string;
  name: string;
  position: string;
  role: string;
  team?: string;
  department?: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseDepartment {
  id: string;
  name: string;
  manager_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Fetch all departments with their managers and members
export const getRealTeamData = async (): Promise<Department[]> => {
  try {
    console.log('=== TEAM DATA DEBUGGING START ===');
    
    // First, let's see what tables exist in the database
    console.log('Checking available tables...');
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      console.log('Available tables:', tables);
      console.log('Tables error:', tablesError);
    } catch (e) {
      console.log('Could not check available tables:', e);
    }

    // Try different possible table names for team members
    console.log('Attempting to fetch team members from database...');
    
    let teamMembers = null;
    let membersError = null;
    let foundTable = '';
    
    // Try 'users' table first
    console.log('Trying users table...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('name');
    
    console.log('Users table result:', { data: usersData, error: usersError });
    
    if (!usersError && usersData && usersData.length > 0) {
      teamMembers = usersData;
      foundTable = 'users';
      console.log('Found data in users table');
    } else {
      console.log('No data in users table, trying employees table...');
      // Try 'employees' table
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      
      console.log('Employees table result:', { data: employeesData, error: employeesError });
      
      if (!employeesError && employeesData && employeesData.length > 0) {
        teamMembers = employeesData;
        membersError = null;
        foundTable = 'employees';
        console.log('Found data in employees table');
      } else {
        console.log('No data in employees table, trying team_members table...');
        // Try 'team_members' table
        const { data: teamData, error: teamError } = await supabase
          .from('team_members')
          .select('*')
          .order('name');
        
        console.log('Team members table result:', { data: teamData, error: teamError });
        
        if (!teamError && teamData && teamData.length > 0) {
          teamMembers = teamData;
          membersError = null;
          foundTable = 'team_members';
          console.log('Found data in team_members table');
        } else {
          console.log('No data in team_members table, trying profiles table...');
          // Try 'profiles' table (common in Supabase auth)
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('name');
          
          console.log('Profiles table result:', { data: profilesData, error: profilesError });
          
          if (!profilesError && profilesData && profilesData.length > 0) {
            teamMembers = profilesData;
            membersError = null;
            foundTable = 'profiles';
            console.log('Found data in profiles table');
          } else {
            membersError = usersError || employeesError || teamError || profilesError;
            console.log('No data found in any table');
          }
        }
      }
    }
    
    console.log('Final result:', { 
      teamMembers, 
      membersError, 
      foundTable,
      teamMembersCount: teamMembers?.length || 0 
    });
    
    if (membersError) {
      console.error('Error fetching team members:', membersError);
      console.log('=== USING FALLBACK DATA ===');
      return getFallbackTeamData();
    }

    if (!teamMembers || teamMembers.length === 0) {
      console.log('No team members found, using fallback data');
      console.log('=== USING FALLBACK DATA ===');
      return getFallbackTeamData();
    }

    console.log('Fetched team members from table:', foundTable);
    console.log('Team members count:', teamMembers.length);
    console.log('Fetched team members:', teamMembers);
    console.log('Sample team member structure:', teamMembers?.[0]);
    
    // Log all unique roles and positions for debugging
    const roles = [...new Set(teamMembers?.map(m => m.role).filter(Boolean) || [])];
    const positions = [...new Set(teamMembers?.map(m => m.position).filter(Boolean) || [])];
    const names = [...new Set(teamMembers?.map(m => m.name).filter(Boolean) || [])];
    console.log('Available roles:', roles);
    console.log('Available positions:', positions);
    console.log('Available names:', names);

    // Transform the data into the expected format
    const transformedDepartments: Department[] = [];

    // Define department mappings based on roles and positions
    const departmentMappings = {
      // Manager roles
      'content_creative_manager': 'Content & Creative Department',
      'customer_retention_manager': 'Customer Retention Department',
      'digital_solution_manager': 'Digital Solutions Department',
      'admin': 'Management Department',
      
      // Position-based mappings
      'Media Buyer': 'Media Buyer Department',
      'Junior CRM Specialist': 'Customer Service Department',
      'Warehouse': 'Warehouse Department',
      'Content Creator': 'Content Creator Department',
      'Designer': 'Design Department',
      
      // Specific team member positions
      'Creative Designer': 'Content & Creative Department',
      'Junior Ads Specialist': 'Content & Creative Department',
      'Customer Retention Specialist': 'Customer Retention Department',
      'Customer Success Coordinator': 'Customer Retention Department',
      'Customer Service Agent': 'Customer Service Department',
      'Senior Customer Service Agent': 'Customer Service Department',
      'Media Buyer Specialist': 'Media Buyer Department',
      'Senior Media Buyer': 'Media Buyer Department',
      'Junior Media Buyer': 'Media Buyer Department',
      'Warehouse Operator': 'Warehouse Department',
      'Senior Warehouse Operator': 'Warehouse Department',
      'Copy Writer': 'Content Creator Department',
      'Senior Copy Writer': 'Content Creator Department',
      'Junior Copy Writer': 'Content Creator Department',
      'Digital Solutions Specialist': 'Digital Solutions Department',
      'Digital Solutions Coordinator': 'Digital Solutions Department',
      
      // Add more specific mappings based on your actual data
      'Design': 'Design Department',
      'Content & Creative': 'Content & Creative Department',
      'Customer Retention': 'Customer Retention Department',
      'Digital Solutions': 'Digital Solutions Department'
    };

    // Group members by department
    const membersByDepartment: { [key: string]: DatabaseTeamMember[] } = {};

    teamMembers?.forEach(member => {
      let department = '';
      
      const memberName = member.name || 'Unknown';
      const memberRole = member.role || '';
      const memberPosition = member.position || '';
      
             console.log('Processing member:', memberName, 'Role:', memberRole, 'Position:', memberPosition, 'Team:', member.team, 'Department:', member.department);
      
             // Determine department based on role, position, and team
       if (member.team) {
         // Use the team field first if available
         department = member.team;
       } else if (member.department) {
         department = member.department;
       } else if (memberRole && departmentMappings[memberRole as keyof typeof departmentMappings]) {
         department = departmentMappings[memberRole as keyof typeof departmentMappings];
       } else if (memberPosition && departmentMappings[memberPosition as keyof typeof departmentMappings]) {
         department = departmentMappings[memberPosition as keyof typeof departmentMappings];
       } else {
        // Try to infer department from name or other fields
        const name = memberName.toLowerCase();
        const position = memberPosition.toLowerCase();
        const role = memberRole.toLowerCase();
        
        if (name.includes('walaa') || name.includes('shrouq') || name.includes('ahmed') || 
            position.includes('creative') || position.includes('content') || role.includes('creative')) {
          department = 'Content & Creative Department';
        } else if (name.includes('omaima') || name.includes('layla') || name.includes('youssef') ||
                   position.includes('retention') || role.includes('retention')) {
          department = 'Customer Retention Department';
        } else if (position.includes('service') || role.includes('service')) {
          department = 'Customer Service Department';
        } else if (position.includes('warehouse') || role.includes('warehouse')) {
          department = 'Warehouse Department';
        } else if (position.includes('media') || role.includes('media')) {
          department = 'Media Buyer Department';
        } else if (position.includes('copy') || role.includes('copy') || position.includes('content creator') || role.includes('content creator')) {
          department = 'Content Creator Department';
        } else if (position.includes('digital') || role.includes('digital')) {
          department = 'Digital Solutions Department';
        } else {
          department = 'Other';
        }
      }

      console.log('Assigned to department:', department);

      if (!membersByDepartment[department]) {
        membersByDepartment[department] = [];
      }
      membersByDepartment[department].push(member);
    });

    console.log('Members by department:', membersByDepartment);

    // Create department objects
    Object.entries(membersByDepartment).forEach(([deptName, members]) => {
      if (members.length === 0) return;

             // Find the manager (person with manager role or highest position)
       const manager = members.find(m => 
         m.role?.includes('manager') || 
         m.position?.includes('Manager') ||
         m.role === 'admin' ||
         m.name?.toLowerCase().includes('dr. walaa') ||
         m.name?.toLowerCase().includes('dr. omaima') ||
         m.name?.toLowerCase().includes('dr. mahmoud') ||
         m.name?.toLowerCase().includes('dr. yathreb')
       );
      
      // If no manager found, use the first person as manager (fallback)
      const actualManager = manager || members[0];
      
      console.log(`Department: ${deptName}`);
      console.log(`Manager found: ${actualManager.name} (${actualManager.role}/${actualManager.position})`);
      console.log(`Team members: ${members.filter(m => m.id !== actualManager.id).map(m => m.name).join(', ')}`);

      // Filter out the manager from team members
      const teamMembers = members.filter(m => m.id !== actualManager.id);

      // Transform all members including manager
      const allMembers: TeamMember[] = [
        // Add manager first
        {
          id: actualManager.id,
          name: actualManager.name || 'Unknown',
          position: actualManager.position || actualManager.role || 'Manager',
          role: actualManager.role || 'Manager',
          isManager: true,
          status: (actualManager.is_active ? 'active' : 'inactive') as TeamMember['status'],
          email: actualManager.email,
          phone: actualManager.phone
        },
        // Add team members
        ...teamMembers.map(member => ({
          id: member.id,
          name: member.name || 'Unknown',
          position: member.position || member.role || 'Team Member',
          role: member.role || 'Team Member',
          isManager: false,
          status: (member.is_active ? 'active' : 'inactive') as TeamMember['status'],
          email: member.email,
          phone: member.phone
        }))
      ];

      // Create department object
      const department: Department = {
        id: deptName.toLowerCase().replace(/\s+/g, '-'),
        name: deptName,
        members: allMembers
      };

      transformedDepartments.push(department);
    });

    console.log('Final transformed departments:', transformedDepartments);
    
    // If no departments were created from real data, return fallback
    if (transformedDepartments.length === 0) {
      console.log('No departments created from real data, using fallback');
      console.log('=== USING FALLBACK DATA ===');
      return getFallbackTeamData();
    }
    
    console.log('=== USING REAL DATA ===');
    return transformedDepartments;
  } catch (error) {
    console.error('Error in getRealTeamData:', error);
    console.log('=== USING FALLBACK DATA DUE TO ERROR ===');
    // Return fallback data if database fetch fails
    return getFallbackTeamData();
  }
};

// Get department icon based on name
const getDepartmentIcon = (departmentName: string) => {
  const iconMap: { [key: string]: any } = {
    'Content & Creative Department': 'Paintbrush',
    'Customer Service Department': 'HeadphonesIcon',
    'Customer Retention Department': 'HeadphonesIcon',
    'Media Buyer Department': 'Target',
    'Digital Solutions Department': 'TrendingUp',
    'Warehouse Department': 'ShoppingCart',
    'Content Creator Department': 'PenTool',
    'Design Department': 'Palette',
    'Marketing Department': 'Megaphone',
    'Sales Department': 'Zap',
    'Technical Support Department': 'Wrench',
    'Web Development Department': 'Globe',
    'IT Department': 'Laptop',
    'Photography Department': 'Camera',
    'Video Production Department': 'Video',
    'Content Creation Department': 'FileText',
    'default': 'Users'
  };
  
  return iconMap[departmentName] || iconMap.default;
};

// Get department color
const getDepartmentColor = (departmentName: string) => {
  const colorMap: { [key: string]: string } = {
    'Content & Creative Department': 'blue',
    'Customer Service Department': 'green',
    'Customer Retention Department': 'purple',
    'Media Buyer Department': 'orange',
    'Digital Solutions Department': 'cyan',
    'Warehouse Department': 'teal',
    'Content Creator Department': 'indigo',
    'Design Department': 'pink',
    'Marketing Department': 'red',
    'Sales Department': 'yellow',
    'Technical Support Department': 'gray',
    'Web Development Department': 'blue',
    'IT Department': 'blue',
    'Photography Department': 'purple',
    'Video Production Department': 'red',
    'Content Creation Department': 'green',
    'default': 'gray'
  };
  
  return colorMap[departmentName] || colorMap.default;
};

// Get open positions for each department
const getOpenPositionsForDepartment = (departmentName: string): TeamMember[] => {
  const openPositions: { [key: string]: string[] } = {
    'Content & Creative Department': ['Creative Designer', 'Content Creator'],
    'Customer Service Department': ['Junior CRM Specialist'],
    'Customer Retention Department': ['Customer Retention Specialist'],
    'Media Buyer Department': ['Junior Media Buyer'],
    'Digital Solutions Department': ['Digital Solutions Specialist'],
    'Warehouse Department': ['Warehouse Operator'],
    'Content Creator Department': ['Junior Copy Writer'],
    'Design Department': ['UI/UX Designer', 'Graphic Designer'],
    'Marketing Department': ['Marketing Specialist'],
    'Sales Department': ['Sales Representative'],
    'Technical Support Department': ['Technical Support Specialist'],
    'Web Development Department': ['Frontend Developer', 'Backend Developer'],
    'Photography Department': ['Photographer'],
    'Video Production Department': ['Video Editor'],
    'Content Creation Department': ['Content Creator']
  };

  const positions = openPositions[departmentName] || [];
  
  return positions.map((position, index) => ({
    id: `open-${departmentName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
    name: '',
    title: position,
    status: 'open',
    isOpen: true
  }));
};

// Fallback data if database is not available
const getFallbackTeamData = (): Department[] => {
  return [
    {
      id: 'content-creative',
      name: 'Content & Creative Department',
      members: [
        {
          id: 'walaa',
          name: 'Dr. Walaa',
          position: 'Content & Creative Manager',
          role: 'Manager',
          isManager: true,
          status: 'active'
        },
        {
          id: 'shrouq',
          name: 'Dr. Shrouq',
          position: 'Content Creator',
          role: 'Content Creator',
          isManager: false,
          status: 'active'
        },
        {
          id: 'ahmed-ashraf',
          name: 'Ahmed Ashraf',
          position: 'Junior Ads Specialist',
          role: 'Ads Specialist',
          isManager: false,
          status: 'active'
        }
      ]
    },
    {
      id: 'customer-retention',
      name: 'Customer Retention Department',
      members: [
        {
          id: 'omaima',
          name: 'Dr. Omaima',
          position: 'Customer Retention Manager',
          role: 'Manager',
          isManager: true,
          status: 'active'
        },
        {
          id: 'retention-1',
          name: 'Layla Khalil',
          position: 'Customer Retention Specialist',
          role: 'Specialist',
          isManager: false,
          status: 'active'
        },
        {
          id: 'retention-2',
          name: 'Youssef Ibrahim',
          position: 'Customer Success Coordinator',
          role: 'Coordinator',
          isManager: false,
          status: 'active'
        }
      ]
    }
  ];
};

// Get department by ID
export const getDepartmentById = async (id: string): Promise<Department | undefined> => {
  const allDepartments = await getRealTeamData();
  return allDepartments.find(dept => dept.id === id);
};

// Get all departments
export const getAllDepartments = async (): Promise<Department[]> => {
  return await getRealTeamData();
};
