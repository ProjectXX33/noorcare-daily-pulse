import { Department } from '@/components/TeamTree';

export const teamData: Department[] = [
  {
    id: 'content-creative',
    name: 'Content & Creative Department',
    icon: 'Paintbrush',
    color: 'blue',
    manager: {
      id: 'walaa',
      name: 'Dr. Walaa',
      title: 'Content & Creative Manager',
      status: 'active',
      isManager: true
    },
    members: [
      {
        id: 'shrouq',
        name: 'Dr. Shrouq',
        title: 'Content Creator',
        status: 'active'
      },
      {
        id: 'ahmed-ashraf',
        name: 'Ahmed Ashraf',
        title: 'Junior Ads Specialist',
        status: 'active'
      },
      {
        id: 'creative-designer',
        name: '',
        title: 'Creative Designer',
        status: 'open',
        isOpen: true
      }
    ]
  },
  {
    id: 'customer-service',
    name: 'Customer Service Department',
    icon: 'HeadphonesIcon',
    color: 'green',
    manager: {
      id: 'customer-manager',
      name: 'Sarah Ahmed',
      title: 'Customer Service Manager',
      status: 'active',
      isManager: true
    },
    members: [
      {
        id: 'agent-1',
        name: 'Fatima Hassan',
        title: 'Senior Customer Service Agent',
        status: 'active'
      },
      {
        id: 'agent-2',
        name: 'Mohammed Ali',
        title: 'Customer Service Agent',
        status: 'active'
      },
      {
        id: 'agent-3',
        name: 'Aisha Omar',
        title: 'Customer Service Agent',
        status: 'active'
      },
      {
        id: 'agent-4',
        name: '',
        title: 'Customer Service Agent',
        status: 'open',
        isOpen: true
      }
    ]
  },
  {
    id: 'customer-retention',
    name: 'Customer Retention Department',
    icon: 'Crown',
    color: 'purple',
    manager: {
      id: 'retention-manager',
      name: 'Dr. Omaima',
      title: 'Customer Retention Manager',
      status: 'active',
      isManager: true
    },
    members: [
      {
        id: 'retention-1',
        name: 'Layla Khalil',
        title: 'Customer Retention Specialist',
        status: 'active'
      },
      {
        id: 'retention-2',
        name: 'Youssef Ibrahim',
        title: 'Customer Success Coordinator',
        status: 'active'
      },
      {
        id: 'retention-3',
        name: '',
        title: 'Customer Retention Specialist',
        status: 'open',
        isOpen: true
      }
    ]
  },
  {
    id: 'media-buyer',
    name: 'Media Buyer Department',
    icon: 'Target',
    color: 'orange',
    manager: {
      id: 'media-manager',
      name: 'Ahmed Saleh',
      title: 'Media Buyer Manager',
      status: 'active',
      isManager: true
    },
    members: [
      {
        id: 'media-1',
        name: 'Nour El-Din',
        title: 'Senior Media Buyer',
        status: 'active'
      },
      {
        id: 'media-2',
        name: 'Mariam Hassan',
        title: 'Media Buyer Specialist',
        status: 'active'
      },
      {
        id: 'media-3',
        name: 'Omar Khalil',
        title: 'Junior Media Buyer',
        status: 'active'
      }
    ]
  },
  {
    id: 'warehouse',
    name: 'Warehouse Department',
    icon: 'ShoppingCart',
    color: 'teal',
    manager: {
      id: 'warehouse-manager',
      name: 'Khalid Al-Rashid',
      title: 'Warehouse Manager',
      status: 'active',
      isManager: true
    },
    members: [
      {
        id: 'warehouse-1',
        name: 'Abdullah Hassan',
        title: 'Senior Warehouse Operator',
        status: 'active'
      },
      {
        id: 'warehouse-2',
        name: 'Ibrahim Ali',
        title: 'Warehouse Operator',
        status: 'active'
      },
      {
        id: 'warehouse-3',
        name: 'Yasin Omar',
        title: 'Warehouse Operator',
        status: 'active'
      },
      {
        id: 'warehouse-4',
        name: 'Hassan Ahmed',
        title: 'Warehouse Operator',
        status: 'active'
      }
    ]
  },
  {
    id: 'copy-writing',
    name: 'Content Creator Department',
    icon: 'PenTool',
    color: 'indigo',
    manager: {
      id: 'copy-manager',
      name: 'Amina El-Sayed',
      title: 'Content Creator Manager',
      status: 'active',
      isManager: true
    },
    members: [
      {
        id: 'copy-1',
        name: 'Zainab Hassan',
        title: 'Senior Copy Writer',
        status: 'active'
      },
      {
        id: 'copy-2',
        name: 'Rania Khalil',
        title: 'Copy Writer',
        status: 'active'
      },
      {
        id: 'copy-3',
        name: '',
        title: 'Junior Copy Writer',
        status: 'open',
        isOpen: true
      }
    ]
  },
  {
    id: 'digital-solutions',
    name: 'Digital Solutions Department',
    icon: 'TrendingUp',
    color: 'cyan',
    manager: {
      id: 'digital-manager',
      name: 'Omar El-Hassan',
      title: 'Digital Solutions Manager',
      status: 'active',
      isManager: true
    },
    members: [
      {
        id: 'digital-1',
        name: 'Layla Ahmed',
        title: 'Digital Solutions Specialist',
        status: 'active'
      },
      {
        id: 'digital-2',
        name: 'Youssef Ibrahim',
        title: 'Digital Solutions Coordinator',
        status: 'active'
      },
      {
        id: 'digital-3',
        name: '',
        title: 'Digital Solutions Specialist',
        status: 'open',
        isOpen: true
      }
    ]
  }
];

export const getDepartmentById = (id: string): Department | undefined => {
  return teamData.find(dept => dept.id === id);
};

export const getAllDepartments = (): Department[] => {
  return teamData;
};

