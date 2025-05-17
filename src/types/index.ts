export type User = {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'employee';
  department: Department;
  position: Position;
  lastCheckin?: Date;
  email: string;
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

export type Task = {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // userId
  assignedToName: string; // username for display
  status: 'On Hold' | 'In Progress' | 'Complete';
  progressPercentage: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // admin userId
}

// Supabase specific types
export type Tables = {
  users: UserRecord;
  check_ins: CheckInRecord;
  work_reports: WorkReportRecord;
  file_attachments: FileAttachmentRecord;
  notifications: NotificationRecord;
  tasks: TaskRecord;
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
  status: 'On Hold' | 'In Progress' | 'Complete';
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}
