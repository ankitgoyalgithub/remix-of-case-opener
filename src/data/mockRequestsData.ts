export interface RequestListItem {
  id: string;
  companyName: string;
  brokerName: string;
  age: number; // days since creation
  slaRemaining: number; // hours remaining
  slaStatus: 'green' | 'amber' | 'red';
  currentStage: string;
  status: 'New' | 'In Review' | 'Missing Info' | 'Ready for Export' | 'Issued';
  owner: string;
  priority: 'High' | 'Medium' | 'Low';
  createdAt: Date;
}

export const mockRequests: RequestListItem[] = [
  {
    id: 'REQ-2024-00142',
    companyName: 'Al Noor Trading LLC',
    brokerName: 'Gulf Insurance Brokers',
    age: 3,
    slaRemaining: 18,
    slaStatus: 'green',
    currentStage: 'Underwriting Review',
    status: 'In Review',
    owner: 'Sarah Ahmed',
    priority: 'High',
    createdAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: 'REQ-2024-00143',
    companyName: 'Emirates Tech Solutions',
    brokerName: 'Al Ain Insurance Services',
    age: 5,
    slaRemaining: 4,
    slaStatus: 'amber',
    currentStage: 'Document Upload',
    status: 'Missing Info',
    owner: 'Mohammed Khan',
    priority: 'High',
    createdAt: new Date('2024-01-13T09:15:00'),
  },
  {
    id: 'REQ-2024-00144',
    companyName: 'Dubai Logistics Group',
    brokerName: 'Takaful Partners',
    age: 1,
    slaRemaining: 46,
    slaStatus: 'green',
    currentStage: 'Data Extraction',
    status: 'New',
    owner: 'Unassigned',
    priority: 'Medium',
    createdAt: new Date('2024-01-17T14:20:00'),
  },
  {
    id: 'REQ-2024-00145',
    companyName: 'Sharjah Manufacturing Co.',
    brokerName: 'National Insurance Brokers',
    age: 7,
    slaRemaining: -2,
    slaStatus: 'red',
    currentStage: 'Workforce Validation',
    status: 'In Review',
    owner: 'Fatima Al Ali',
    priority: 'High',
    createdAt: new Date('2024-01-11T11:45:00'),
  },
  {
    id: 'REQ-2024-00146',
    companyName: 'Abu Dhabi Construction LLC',
    brokerName: 'Emirates Insurance Agency',
    age: 2,
    slaRemaining: 32,
    slaStatus: 'green',
    currentStage: 'Premium Calculation',
    status: 'Ready for Export',
    owner: 'Sarah Ahmed',
    priority: 'Medium',
    createdAt: new Date('2024-01-16T08:00:00'),
  },
  {
    id: 'REQ-2024-00147',
    companyName: 'Ras Al Khaimah Imports',
    brokerName: 'Gulf Insurance Brokers',
    age: 10,
    slaRemaining: 0,
    slaStatus: 'red',
    currentStage: 'Export & Issue',
    status: 'Issued',
    owner: 'Mohammed Khan',
    priority: 'Low',
    createdAt: new Date('2024-01-08T16:30:00'),
  },
  {
    id: 'REQ-2024-00148',
    companyName: 'Fujairah Retail Corp',
    brokerName: 'Al Ain Insurance Services',
    age: 4,
    slaRemaining: 8,
    slaStatus: 'amber',
    currentStage: 'Underwriting Review',
    status: 'In Review',
    owner: 'Fatima Al Ali',
    priority: 'Medium',
    createdAt: new Date('2024-01-14T13:00:00'),
  },
];
