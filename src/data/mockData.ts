
import { User, CheckIn, WorkReport } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'ProjectX',
    name: 'Admin User',
    role: 'admin',
    department: 'IT',
    position: 'Media Buyer',
    email: 'admin@noorcare.com'
  },
  {
    id: '2',
    username: 'john.doe',
    name: 'John Doe',
    role: 'employee',
    department: 'Engineering',
    position: 'Designer',
    lastCheckin: new Date(2025, 4, 13, 9, 15), // Yesterday
    email: 'john@noorcare.com'
  },
  {
    id: '3',
    username: 'sarah.smith',
    name: 'Sarah Smith',
    role: 'employee',
    department: 'Doctor',
    position: 'Copy Writing',
    email: 'sarah@noorcare.com'
  },
  {
    id: '4',
    username: 'ahmed.ali',
    name: 'Ahmed Ali',
    role: 'employee',
    department: 'Manager',
    position: 'Customer Service',
    lastCheckin: new Date(2025, 4, 14, 8, 30), // Today
    email: 'ahmed@noorcare.com'
  }
];

export const mockCheckIns: CheckIn[] = [
  {
    id: '1',
    userId: '2',
    timestamp: new Date(2025, 4, 13, 9, 15), // Yesterday
    userName: 'John Doe',
    department: 'Engineering',
    position: 'Designer',
    checkOutTime: new Date(2025, 4, 13, 17, 30) // Added checkout time for yesterday
  },
  {
    id: '2',
    userId: '4',
    timestamp: new Date(2025, 4, 14, 8, 30), // Today
    userName: 'Ahmed Ali',
    department: 'Manager',
    position: 'Customer Service',
    checkOutTime: null // Hasn't checked out yet today
  },
  {
    id: '3',
    userId: '2',
    timestamp: new Date(2025, 4, 12, 9, 45), // Day before yesterday
    userName: 'John Doe',
    department: 'Engineering',
    position: 'Designer',
    checkOutTime: new Date(2025, 4, 12, 18, 15) // Added checkout time
  },
  {
    id: '4',
    userId: '2',
    timestamp: new Date(2025, 4, 11, 8, 50), // 3 days ago
    userName: 'John Doe',
    department: 'Engineering',
    position: 'Designer',
    checkOutTime: new Date(2025, 4, 11, 17, 45) // Added checkout time
  }
];

export const mockWorkReports: WorkReport[] = [
  {
    id: '1',
    userId: '2',
    userName: 'John Doe',
    date: new Date(2025, 4, 13), // Yesterday
    tasksDone: 'Completed the design for the new landing page. Reviewed feedback from the marketing team.',
    issuesFaced: 'Some compatibility issues with older browsers that needed adjustments.',
    plansForTomorrow: 'Start working on the mobile responsive design and implement the changes requested by the marketing team.',
    department: 'Engineering',
    position: 'Designer',
    createdAt: new Date(2025, 4, 13, 17, 0) // Added createdAt property
  },
  {
    id: '2',
    userId: '4',
    userName: 'Ahmed Ali',
    date: new Date(2025, 4, 13), // Yesterday
    tasksDone: 'Handled customer complaints and resolved 15 tickets. Conducted training for new team members.',
    issuesFaced: 'One complex customer issue required escalation to technical team.',
    plansForTomorrow: 'Follow up on escalated issues and finalize the customer service improvement plan.',
    fileAttachments: ['customer_feedback.pdf'],
    department: 'Manager',
    position: 'Customer Service',
    createdAt: new Date(2025, 4, 13, 16, 30) // Added createdAt property
  },
  {
    id: '3',
    userId: '2',
    userName: 'John Doe',
    date: new Date(2025, 4, 12), // Day before yesterday
    tasksDone: 'Created wireframes for the new product page. Attended design team meeting.',
    issuesFaced: 'Unclear requirements for one of the features.',
    plansForTomorrow: 'Meet with product team to clarify requirements and continue working on wireframes.',
    department: 'Engineering',
    position: 'Designer',
    createdAt: new Date(2025, 4, 12, 17, 15) // Added createdAt property
  }
];
