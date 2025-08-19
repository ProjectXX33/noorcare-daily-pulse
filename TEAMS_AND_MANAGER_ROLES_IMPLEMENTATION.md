# Teams and Manager Roles Implementation Guide

## Overview
This implementation adds team assignment functionality and new manager roles to the NoorCare Daily Pulse system. The system now supports three teams and three corresponding manager roles as requested.

## New Teams Added
1. **Content & Creative Department**
   - Handles creative content, design, and copywriting tasks
   - Manager Role: Content & Creative Manager

2. **Customer Retention Department**
   - Focuses on customer service and retention strategies
   - Manager Role: Customer Retention Manager

3. **IT Department**
   - Manages technical infrastructure and development
   - Manager Role: Digital Solution Department Manager

## New Manager Roles Added
1. **Content & Creative Manager** (`content_creative_manager`)
   - Display Name: "Content & Creative Manager"
   - Manages the Content & Creative Department
   - Permissions: manage_team_tasks, approve_content, assign_projects, view_team_analytics

2. **Customer Retention Manager** (`customer_retention_manager`)
   - Display Name: "Customer Retention Manager"
   - Manages the Customer Retention Department
   - Permissions: manage_customer_service, view_customer_analytics, manage_team_schedule, handle_escalations

3. **Digital Solution Department Manager** (`digital_solution_manager`)
   - Display Name: "Digital Solution Department Manager"
   - Manages the IT Department
   - Permissions: manage_it_projects, system_administration, tech_team_management, development_oversight

## Database Changes

### 1. Database Migration File: `add_teams_and_manager_roles.sql`
This comprehensive SQL file includes:

- **New Columns:**
  - Added `team` column to `users` table
  - Updated role constraints to include new manager roles
  - Added team constraints

- **New Tables:**
  - `teams` - Stores team definitions and metadata
  - `manager_roles` - Stores manager role definitions with permissions
  - `team_assignments_audit` - Tracks team assignment changes

- **New Functions:**
  - `get_team_members(team_name)` - Retrieves all members of a specific team
  - `get_team_manager(team_name)` - Gets the manager of a specific team
  - `log_team_assignment_change()` - Trigger function for audit logging

- **Row Level Security (RLS):**
  - Proper RLS policies for all new tables
  - Access control based on roles and permissions

### 2. Updated Constraints
- Role constraint now includes: `admin`, `employee`, `warehouse`, `content_creative_manager`, `customer_retention_manager`, `digital_solution_manager`
- Team constraint includes: `Content & Creative Department`, `Customer Retention Department`, `IT Department`
- Department constraint expanded to include: `Creative`, `Customer Service`, `IT & Development`

## Frontend Changes

### 1. Updated TypeScript Types (`src/types/index.ts`)
- Added `Team` type with the three team options
- Added `ManagerRole` type for the new manager roles
- Updated `User` and `UserRecord` types to include optional `team` field
- Added team-related types: `TeamRecord`, `ManagerRoleRecord`, `TeamAssignmentAudit`, etc.
- Updated `Tables` type to include new tables

### 2. Updated Admin Employees Page (`src/pages/AdminEmployeesPage.tsx`)
- Added team column to the employee table
- Added team selection dropdown in add/edit employee forms
- Updated role selection to include new manager roles
- Added team badges with color coding
- Updated translations for both English and Arabic
- Added team assignment functionality

### 3. Updated Employees API (`src/lib/employeesApi.ts`)
- Updated `fetchEmployees()` to include team field
- Updated `createEmployee()` to support team assignment and new roles
- Updated `updateEmployee()` to handle team changes
- All API functions now properly handle the team field

### 4. New Teams API (`src/lib/teamsApi.ts`)
Comprehensive team management API including:
- `fetchTeams()` - Get all active teams
- `fetchManagerRoles()` - Get all manager roles
- `getTeamMembers(teamName)` - Get members of a specific team
- `getTeamManager(teamName)` - Get team manager info
- `assignUserToTeam()` - Assign user to team
- `removeUserFromTeam()` - Remove user from team
- `getTeamAssignmentAudit()` - Get audit trail
- `getTeamStats()` - Get team analytics (structure for future expansion)
- Helper functions for UI display

## Features Implemented

### 1. Team Assignment
- Admins can assign employees to teams during creation or editing
- Team assignment is optional - employees can remain unassigned
- Team changes are automatically logged in audit table
- Visual team badges with distinct colors for each team

### 2. Manager Roles
- Three new admin-level roles for team management
- Each manager role is tied to a specific team
- Permission structure in place for future role-based access control
- Manager roles have elevated privileges while being team-specific

### 3. Audit Trail
- All team assignments and changes are logged
- Tracks who made the change and when
- Includes reason field for future use
- Automatic trigger-based logging

### 4. User Interface Enhancements
- Team column in employee table (hidden on smaller screens for responsive design)
- Team dropdown in add/edit employee forms
- Color-coded team badges for visual distinction
- Support for both English and Arabic translations
- Proper responsive design for mobile devices

## Default Team Assignments
The migration automatically assigns existing employees to teams based on their positions:
- **Designers & Copy Writers** → Content & Creative Department
- **Customer Service** → Customer Retention Department  
- **Web Developers** → IT Department
- **Media Buyers & Warehouse Staff** → No team assigned (manual assignment needed)

## Security Features
- Row Level Security (RLS) enabled on all new tables
- Proper access controls for team data
- Manager roles have appropriate permissions for their teams
- Audit logging for compliance and tracking

## Next Steps (Future Enhancements)
Based on your requirements for role permissions, you can now:

1. **Define Role Permissions:** Specify what each manager role can do in the system
2. **Implement Role-Based Access Control:** Use the permission system to control feature access
3. **Team Dashboards:** Create team-specific dashboards for managers
4. **Team Analytics:** Expand the team stats functionality
5. **Team-Based Task Assignment:** Enhance task management with team context
6. **Team Performance Tracking:** Add team-level performance metrics

## How to Deploy

1. **Run the Database Migration:**
   ```sql
   -- Execute the contents of add_teams_and_manager_roles.sql in your Supabase SQL Editor
   ```

2. **Deploy Frontend Changes:**
   - The TypeScript types and UI components are ready
   - No additional configuration needed

3. **Test the Implementation:**
   - Create new employees with team assignments
   - Edit existing employees to assign teams
   - Verify that manager roles can be assigned
   - Check that team badges display correctly

## Summary
The implementation successfully adds:
- ✅ 3 Teams (Content & Creative, Customer Retention, IT)
- ✅ 3 Manager Roles (with team-specific permissions)
- ✅ Team assignment functionality in admin interface
- ✅ Complete database schema with audit trails
- ✅ Updated TypeScript types and UI components
- ✅ Responsive design and multilingual support

The system is now ready for you to define specific permissions for each manager role. Let me know what capabilities you want each manager role to have, and I can implement the role-based access control accordingly.


