export type User = {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'employee' | 'warehouse' | 'content_creative_manager' | 'customer_retention_manager' | 'digital_solution_manager' | 'ecommerce_manager';
  department: Department;
  position: Position;
  team?: Team;
  lastCheckin?: Date;
  email: string;
  preferences?: UserPreferences;
  latestRating?: EmployeeRating;
  averageRating?: number;
  diamondRank?: boolean;
  diamondRankAssignedBy?: string;
  diamondRankAssignedAt?: Date;
};

export type Department = 'Engineering' | 'Medical' | 'General' | 'Management' | 'Creative' | 'Customer Service' | 'IT & Development' | 'E-commerce';

export type Team = 'Content & Creative Department' | 'Customer Retention Department' | 'IT Department' | 'E-commerce Department';

export type ManagerRole = 'content_creative_manager' | 'customer_retention_manager' | 'digital_solution_manager' | 'ecommerce_manager';

export type Position = 'Junior CRM Specialist' | 'Senior CRM Pharmacist' | 'Designer' | 'Media Buyer' | 'Content Creator' | 'Web Developer' | 'Warehouse Staff' | 'Executive Director' | 'Content & Creative Manager' | 'Customer Retention Manager' | 'IT Manager' | 'E-commerce Manager' | 'Digital Solution Manager' | 'General Manager';

export type CheckIn = {
  id: string;
  userId: string;
  timestamp: Date;
  userName: string;
  department: Department;
  position: Position;
  checkOutTime: Date | null;
  // Break time tracking
  breakStartTime?: Date | null;
  breakEndTime?: Date | null;
  totalBreakMinutes?: number;
  isOnBreak?: boolean;
  currentBreakReason?: string;
  breakSessions?: Array<{
    start_time: string;
    end_time: string;
    duration_minutes: number;
    reason: string;
  }>;
};

export type WorkReport = {
  id: string;
  userId: string;
  userName: string;
  date: Date;
  tasksDone: string;
  issuesFaced: string;
  plansForTomorrow: string;
  fileAttachments?: string[];
  department: Department;
  position: Position;
  createdAt: Date; // Added this property to match with CheckInContext's WorkReport
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  relatedTo?: string;
  relatedId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete' | 'Unfinished';
  assignedTo: string;
  assignedToName?: string;
  assignedToPosition?: string;
  createdBy: string;
  createdByName?: string;
  createdByPosition?: string;
  createdAt: Date;
  updatedAt: Date;
  progressPercentage: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  projectType?: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other';
  comments?: TaskComment[];
  latestRating?: TaskRating;
  averageRating?: number;
  isLocked?: boolean;
  // New fields for designer tasks
  tacticalPlan?: string;
  timeEstimate?: string;
  aim?: string;
  idea?: string;
  copy?: string;
  visualFeeding?: string;
  attachmentFile?: string;
  notes?: string;
}

export type TaskComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};

// Work Time Configuration Types
export type WorkTimeConfig = {
  id: string;
  name: string;
  dailyResetTime: string; // HH:MM format
  workDayStart: string; // HH:MM format
  workDayEnd: string; // HH:MM format
  createdAt: Date;
  updatedAt: Date;
};

// Shift Types
export type Shift = {
  id: string;
  name: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  position: Position;
  isActive: boolean;
  allTimeOvertime?: boolean; // When true, all time worked is counted as overtime
  createdAt: Date;
  updatedAt: Date;
};

// Monthly Shift Tracking Types
export type MonthlyShift = {
  id: string;
  userId: string;
  shiftId: string | null;
  workDate: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  regularHours: number;
  overtimeHours: number;
  delayMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  // Day off tracking
  isDayOff?: boolean;
  // Populated fields
  userName?: string;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  // Break time tracking
  totalBreakMinutes?: number;
  breakSessions?: Array<{
    start_time: string;
    end_time: string;
    duration_minutes: number;
    reason: string;
  }>;
  // For all-time overtime shifts
  allTimeOvertime?: boolean;
};

// Rating Types
export type EmployeeRating = {
  id: string;
  employeeId: string;
  rating: number; // 1-5 stars
  comment?: string;
  ratedBy: string;
  ratedByName?: string;
  ratedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskRating = {
  id: string;
  taskId: string;
  rating: number; // 1-5 stars
  comment?: string;
  ratedBy: string;
  ratedByName?: string;
  ratedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

// Supabase specific types
export type Tables = {
  users: UserRecord;
  check_ins: CheckInRecord;
  work_reports: WorkReportRecord;
  file_attachments: FileAttachmentRecord;
  notifications: NotificationRecord;
  tasks: TaskRecord;
  work_time_config: WorkTimeConfigRecord;
  shifts: ShiftRecord;
  monthly_shifts: MonthlyShiftRecord;
  employee_ratings: EmployeeRatingRecord;
  task_ratings: TaskRatingRecord;
  teams: TeamRecord;
  manager_roles: ManagerRoleRecord;
  team_assignments_audit: TeamAssignmentAudit;
};

export type UserRecord = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'employee' | 'warehouse' | 'content_creative_manager' | 'customer_retention_manager' | 'digital_solution_manager' | 'ecommerce_manager';
  department: Department;
  position: Position;
  team?: Team;
  last_checkin: string | null;
  created_at: string;
  updated_at: string;
  diamond_rank?: boolean;
  diamond_rank_assigned_by?: string;
  diamond_rank_assigned_at?: string;
};

export type CheckInRecord = {
  id: string;
  user_id: string;
  timestamp: string;
  checkout_time: string | null;
  created_at: string;
  // Break time tracking
  break_start_time?: string | null;
  break_end_time?: string | null;
  total_break_minutes?: number;
  is_on_break?: boolean;
  current_break_reason?: string;
  break_sessions?: Array<{
    start_time: string;
    end_time: string;
    duration_minutes: number;
    reason: string;
  }>;
};

export type WorkReportRecord = {
  id: string;
  user_id: string;
  date: string;
  tasks_done: string;
  issues_faced: string | null;
  plans_for_tomorrow: string;
  created_at: string;
};

export type FileAttachmentRecord = {
  id: string;
  work_report_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  created_at: string;
};

export type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_to?: string;
  related_id?: string;
};

export type TaskRecord = {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  status: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete' | 'Unfinished';
  progress_percentage: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project_type: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other';
  created_at: string;
  updated_at: string;
  created_by: string;
  comments: TaskComment[];
  is_locked?: boolean;
  // New fields for designer tasks
  tactical_plan?: string;
  time_estimate?: string;
  aim?: string;
  idea?: string;
  copy?: string;
  visual_feeding?: string;
  attachment_file?: string;
  notes?: string;
}

export type WorkTimeConfigRecord = {
  id: string;
  name: string;
  daily_reset_time: string;
  work_day_start: string;
  work_day_end: string;
  created_at: string;
  updated_at: string;
};

export type ShiftRecord = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  position: string;
  is_active: boolean;
  all_time_overtime: boolean;
  created_at: string;
  updated_at: string;
};

export type MonthlyShiftRecord = {
  id: string;
  user_id: string;
  shift_id: string;
  work_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  regular_hours: number;
  overtime_hours: number;
  delay_minutes: number;
  created_at: string;
  updated_at: string;
};

export type EmployeeRatingRecord = {
  id: string;
  employee_id: string;
  rating: number;
  comment: string | null;
  rated_by: string;
  rated_at: string;
  created_at: string;
  updated_at: string;
};

export type TaskRatingRecord = {
  id: string;
  task_id: string;
  rating: number;
  comment: string | null;
  rated_by: string;
  rated_at: string;
  created_at: string;
  updated_at: string;
};

export interface UserPreferences {
  notifications: {
    enabled: boolean;
    email: boolean;
  };
  theme: 'light' | 'dark';
}

// Warehouse Order Management Types
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'on-hold';

export type OrderNote = {
  id: string;
  orderId: number;
  note: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  noteType: 'general' | 'status_change' | 'cancel_reason' | 'warehouse';
};

export type OrderStatusHistory = {
  id: string;
  orderId: number;
  oldStatus: string;
  newStatus: string;
  reason?: string;
  changedBy: string;
  changedByName: string;
  changedAt: Date;
};

export type ShippingMethod = {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
};

// Team Management Types
export type TeamRecord = {
  id: string;
  name: string;
  description: string | null;
  manager_role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ManagerRoleRecord = {
  id: string;
  role_name: string;
  display_name: string;
  description: string | null;
  team_id: string | null;
  permissions: any; // JSONB
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeamAssignmentAudit = {
  id: string;
  user_id: string;
  old_team: string | null;
  new_team: string | null;
  assigned_by: string | null;
  assigned_at: string;
  reason: string | null;
};

export type TeamMember = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  department: string;
  user_position: string;
  team?: string;
};

export type TeamManagerInfo = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
};
