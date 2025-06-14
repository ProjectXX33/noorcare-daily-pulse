export type User = {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'employee';
  department: Department;
  position: Position;
  lastCheckin?: Date;
  email: string;
  preferences?: UserPreferences;
  latestRating?: EmployeeRating;
  averageRating?: number;
};

export type Department = 'Engineering' | 'Medical' | 'General' | 'Management';

export type Position = 'Customer Service' | 'Designer' | 'Media Buyer' | 'Copy Writing' | 'Web Developer';

export type CheckIn = {
  id: string;
  userId: string;
  timestamp: Date;
  userName: string;
  department: Department;
  position: Position;
  checkOutTime: Date | null;
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
  status: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete';
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
  position: 'Customer Service' | 'Designer';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Monthly Shift Tracking Types
export type MonthlyShift = {
  id: string;
  userId: string;
  shiftId: string;
  workDate: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  regularHours: number;
  overtimeHours: number;
  delayMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  // Populated fields
  userName?: string;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
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
};

export type UserRecord = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department: Department;
  position: Position;
  last_checkin: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckInRecord = {
  id: string;
  user_id: string;
  timestamp: string;
  checkout_time: string | null;
  created_at: string;
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
  status: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete';
  progress_percentage: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project_type: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other';
  created_at: string;
  updated_at: string;
  created_by: string;
  comments: TaskComment[];
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
