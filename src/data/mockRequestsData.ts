import { SLA_TARGETS, calculateSlaRemaining, getSlaStatus, getAutoAssignedQueue } from '@/types/case';

export interface RequestListItem {
  id: string;
  companyName: string;
  brokerName: string;
  brokerEmail: string;
  age: number; // days since creation
  slaRemaining: number; // hours remaining
  slaStatus: 'green' | 'amber' | 'red';
  slaTargetHours: number;
  currentStage: string;
  currentStageId: number;
  status: 'New' | 'In Review' | 'Missing Info' | 'Ready for Export' | 'Issued';
  owner: string;
  priority: 'Urgent' | 'Normal';
  queue: 'Senior Ops Queue' | 'Standard Ops Queue';
  createdAt: Date;
}

// Helper to create request with calculated SLA
function createRequest(
  id: string,
  companyName: string,
  brokerName: string,
  brokerEmail: string,
  hoursAgo: number,
  currentStage: string,
  currentStageId: number,
  status: RequestListItem['status'],
  owner: string,
  priority: 'Urgent' | 'Normal'
): RequestListItem {
  const createdAt = new Date();
  createdAt.setHours(createdAt.getHours() - hoursAgo);
  
  const slaTargetHours = SLA_TARGETS[priority];
  const slaRemaining = calculateSlaRemaining(createdAt, priority);
  const slaStatus = getSlaStatus(slaRemaining, slaTargetHours);
  const queue = getAutoAssignedQueue(priority);
  
  return {
    id,
    companyName,
    brokerName,
    brokerEmail,
    age: Math.floor(hoursAgo / 24),
    slaRemaining,
    slaStatus,
    slaTargetHours,
    currentStage,
    currentStageId,
    status,
    owner,
    priority,
    queue,
    createdAt,
  };
}

export const mockRequests: RequestListItem[] = [
  createRequest(
    'REQ-2024-00142',
    'Al Noor Trading LLC',
    'Gulf Insurance Brokers',
    'ops@gulfinsurancebrokers.ae',
    30, // 30 hours ago
    'Declarations & Medical',
    4,
    'In Review',
    'Sarah Ahmed',
    'Normal'
  ),
  createRequest(
    'REQ-2024-00143',
    'Emirates Tech Solutions',
    'Al Ain Insurance Services',
    'claims@alaininsurance.ae',
    20, // 20 hours ago - urgent, so amber
    'Intake & Completeness',
    1,
    'Missing Info',
    'Mohammed Khan',
    'Urgent'
  ),
  createRequest(
    'REQ-2024-00144',
    'Dubai Logistics Group',
    'Takaful Partners',
    'ops@takafulpartners.ae',
    6, // 6 hours ago
    'Employer & Legal Validation',
    2,
    'New',
    'Unassigned',
    'Normal'
  ),
  createRequest(
    'REQ-2024-00145',
    'Sharjah Manufacturing Co.',
    'National Insurance Brokers',
    'support@nationalbrokers.ae',
    50, // 50 hours ago - breached
    'Workforce Validation',
    3,
    'In Review',
    'Fatima Al Ali',
    'Normal'
  ),
  createRequest(
    'REQ-2024-00146',
    'Abu Dhabi Construction LLC',
    'Emirates Insurance Agency',
    'ops@emiratesinsurance.ae',
    35, // 35 hours ago
    'Commercial Validation',
    5,
    'Ready for Export',
    'Sarah Ahmed',
    'Normal'
  ),
  createRequest(
    'REQ-2024-00147',
    'Ras Al Khaimah Imports',
    'Gulf Insurance Brokers',
    'ops@gulfinsurancebrokers.ae',
    96, // 4 days ago - issued
    'Export to Core System',
    7,
    'Issued',
    'Mohammed Khan',
    'Normal'
  ),
  createRequest(
    'REQ-2024-00148',
    'Fujairah Retail Corp',
    'Al Ain Insurance Services',
    'claims@alaininsurance.ae',
    22, // 22 hours ago - urgent, red
    'Declarations & Medical',
    4,
    'In Review',
    'Fatima Al Ali',
    'Urgent'
  ),
];

// Get count of requests at SLA risk
export function getSlaRiskCount(): { amber: number; red: number; total: number } {
  const amber = mockRequests.filter(r => r.slaStatus === 'amber').length;
  const red = mockRequests.filter(r => r.slaStatus === 'red').length;
  return { amber, red, total: amber + red };
}
