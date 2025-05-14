
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

export type Position = 'Customer Service' | 'Designer' | 'Media Buyer' | 'Copy Writing';

export type CheckIn = {
  id: string;
  userId: string;
  timestamp: Date;
  userName: string;
  department: Department;
  position: Position;
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
};
