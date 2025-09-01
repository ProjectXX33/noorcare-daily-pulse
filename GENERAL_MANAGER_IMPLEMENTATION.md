# General Manager Role Implementation

## 🎯 Overview
This document outlines the implementation of the new "General Manager" role in the NoorCare Daily Pulse system. This role has the same access level as "Executive Director" - full access to all pages, dashboards, and features.

## 📋 Role Details

### Role Information
- **Role Name**: General Manager
- **Database Role**: `admin` (same as Executive Director)
- **Database Position**: `General Manager`
- **Access Level**: Same as Executive Director (full access to everything)

### Permissions & Access
The General Manager has access to all pages and features in the system:

#### ✅ Dashboard Access
- **Admin Dashboard** (`/dashboard`) - Full access
- **Employee Dashboard** (`/employee-dashboard`) - Full access
- **Content Creative Dashboard** (`/content-creative-dashboard`) - Full access
- **Customer Retention Dashboard** (`/customer-retention-dashboard`) - Full access
- **E-commerce Dashboard** (`/ecommerce-dashboard`) - Full access
- **Designer Dashboard** (`/designer-dashboard`) - Full access
- **Copy Writing Dashboard** (`/copy-writing-dashboard`) - Full access
- **Warehouse Dashboard** (`/warehouse-dashboard`) - Full access

#### ✅ Customer Service Tools
- **Create Order** (`/create-order`) - Full access
- **My Orders** (`/my-orders`) - Full access
- **Total Orders** (`/admin-total-orders`) - Full access
- **Loyal Customers** (`/loyal-customers`) - Full access
- **Customer Service CRM** (`/customer-service-crm`) - Full access

#### ✅ Employee Management
- **Employees** (`/employees`) - Full access
- **Shift Management** (`/admin-shift-management`) - Full access
- **Performance Dashboard** (`/performance-dashboard`) - Full access
- **Bug Reports** (`/admin-bug-reports`) - Full access
- **Reports** (`/reports`) - Full access
- **Ratings** (`/admin-ratings`) - Full access
- **Tasks** (`/tasks`) - Full access
- **Break Time** (`/admin-break-time`) - Full access

#### ✅ Team Management
- **Team Reports** (`/team-reports`) - Full access
- **Customer Retention Team Reports** (`/customer-retention-team-reports`) - Full access
- **Team Shifts** (`/team-shifts`) - Full access

#### ✅ Creative & Content
- **Strategy** (`/strategy`) - Full access
- **Media Buyer Tasks** (`/media-buyer-tasks`) - Full access
- **Content Creator Tasks** (`/content-creator-tasks`) - Full access

#### ✅ Communication & Events
- **Events** (`/events`) - Full access
- **Workspace** (`/workspace`) - Full access

#### ✅ Settings & Configuration
- **Settings** (`/settings`) - Full access
- **Our Team** (`/our-team`) - Full access

#### ✅ Chatbot Access
- **AI Chatbot** - Full access to all chatbot features

## 🔧 Technical Implementation

### Database Changes
1. **SQL File**: `add_general_manager_role.sql`
   - Updates position constraint to include "General Manager"
   - Maintains all existing positions
   - Provides verification queries

### Frontend Changes

#### 1. Type Definitions (`src/types/index.ts`)
```typescript
export type Position = 'Junior CRM Specialist' | 'Senior CRM Pharmacist' | 'Designer' | 'Media Buyer' | 'Content Creator' | 'Web Developer' | 'Warehouse Staff' | 'Executive Director' | 'Content & Creative Manager' | 'Customer Retention Manager' | 'IT Manager' | 'E-commerce Manager' | 'Digital Solution Manager' | 'General Manager';
```

#### 2. Route Guards (`src/App.tsx`)
All route guard components now include General Manager bypass:
- **AdminRoute**: Full access to admin-only routes
- **EmployeeRoute**: Full access to employee routes
- **EmployeeDashboardRoute**: Full access to employee dashboard
- **CustomerServiceRoute**: Full access to customer service routes
- **CustomerServiceAndRetentionRoute**: Full access to customer service and retention routes
- **MediaBuyerRoute**: Full access to media buyer routes
- **DesignerRoute**: Full access to designer routes
- **CopyWritingRoute**: Full access to content creator routes
- **StrategyRoute**: Full access to strategy routes
- **AdminAndMediaBuyerRoute**: Full access to admin and media buyer routes
- **WarehouseRoute**: Full access to warehouse routes

#### 3. Sidebar Navigation (`src/components/SidebarNavigation.tsx`)
- **Item Filtering**: General Manager can see all navigation items
- **Group Filtering**: General Manager can see all navigation groups
- **Bypass Logic**: Added to both item and group filtering functions

#### 4. Chatbot Access (`src/components/FloatingChatbot.tsx`)
- **Hover Effects**: General Manager can hover over chatbot
- **Click Access**: General Manager can open and use chatbot
- **Toast Messages**: Updated to include General Manager in access list

#### 5. Admin Interface Updates
- **AdminEmployeesPage.tsx**: Position dropdowns include "General Manager"
- **AdminShiftManagement.tsx**: Position dropdowns include "General Manager"

### Access Control Pattern
The implementation follows the same pattern used for Digital Solution Manager:

```typescript
// Example from route guards
if (user?.position === 'Digital Solution Manager' || user?.position === 'General Manager') {
  return <>{children}</>;
}
```

This pattern ensures that General Manager has the same unlimited access as Digital Solution Manager.

## 🚀 Usage Instructions

### For General Managers
1. **Full System Access**: Access any page, dashboard, or feature in the system
2. **Employee Management**: Manage all employees, shifts, and performance data
3. **Customer Service**: Access all customer service tools and order management
4. **Analytics & Reports**: View all reports, statistics, and performance data
5. **System Configuration**: Access settings and configuration options

### For Administrators
1. **Setting Up the Role**: Run the SQL implementation file
2. **Assigning the Position**: Set user position to "General Manager" in admin interface
3. **Verification**: Verify that the user has access to all system features

## 🔒 Security & Permissions

### Access Control Matrix
| Feature | Admin | General Manager | Executive Director | Other Roles |
|---------|-------|-----------------|-------------------|-------------|
| All Dashboards | ✅ Full | ✅ Full | ✅ Full | ❌ Limited |
| Employee Management | ✅ Full | ✅ Full | ✅ Full | ❌ Limited |
| Customer Service | ✅ Full | ✅ Full | ✅ Full | ❌ Limited |
| System Settings | ✅ Full | ✅ Full | ✅ Full | ❌ Limited |
| All Reports | ✅ Full | ✅ Full | ✅ Full | ❌ Limited |
| Chatbot Access | ✅ Full | ✅ Full | ✅ Full | ❌ Limited |

### Data Protection
- **Row Level Security**: Database-level access control maintained
- **Role-based Permissions**: Frontend and backend validation
- **Audit Trail**: All actions logged for security purposes

## 📝 Implementation Notes

### Key Changes Made
1. **Database Schema**: Updated position constraints
2. **TypeScript Types**: Added General Manager to Position union type
3. **Route Guards**: Added bypass logic to all route protection components
4. **Sidebar Navigation**: Updated filtering logic for unlimited access
5. **Chatbot Access**: Extended access to include General Manager
6. **Admin Interface**: Updated position dropdowns in employee and shift management

### Testing Recommendations
1. **Access Verification**: Test access to all major pages and features
2. **Permission Bypass**: Verify that General Manager bypasses all restrictions
3. **Navigation Items**: Confirm all sidebar items and groups are visible
4. **Chatbot Functionality**: Test chatbot access and functionality
5. **Admin Functions**: Verify access to employee management and system settings

## 🔄 Future Considerations

### Potential Enhancements
1. **Role-specific Features**: Add General Manager-specific dashboard widgets
2. **Audit Logging**: Enhanced logging for General Manager actions
3. **Custom Permissions**: Fine-grained permission control if needed
4. **Role Hierarchy**: Establish clear hierarchy between Executive Director and General Manager

### Maintenance
- **Regular Audits**: Review General Manager access and permissions
- **Security Updates**: Ensure access controls remain secure
- **User Training**: Provide appropriate training for General Manager users

## 📚 Related Documentation
- [Senior CRM Pharmacist Implementation](./SENIOR_CRM_PHARMACIST_IMPLEMENTATION.md)
- [Digital Solution Manager Implementation](./DIGITAL_SOLUTION_MANAGER_IMPLEMENTATION.md)
- [Customer Retention Manager Implementation](./CUSTOMER_RETENTION_MANAGER_IMPLEMENTATION.md)
- [Route Guard System Documentation](./ROUTE_GUARD_SYSTEM.md)
- [Access Control Matrix](./ACCESS_CONTROL_MATRIX.md)

