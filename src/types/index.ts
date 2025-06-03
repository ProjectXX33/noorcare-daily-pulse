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
};

export type Department = 'Engineering' | 'IT' | 'Doctor' | 'Manager';

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
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  progressPercentage: number;
  comments?: TaskComment[];
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
  position: 'Customer Service';
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
  createdAt: Date;
  updatedAt: Date;
  // Populated fields
  userName?: string;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
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
  created_at: string;
  updated_at: string;
  created_by: string;
  comments: TaskComment[];
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
