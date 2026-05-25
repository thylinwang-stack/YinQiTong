export type StatusKind = 'default' | 'processing' | 'success' | 'warning' | 'error';

export interface UserProfile {
  id: string;
  name: string;
  roleCodes: string[];
  permissions: string[];
  cityScope: string[];
}

export interface MenuItemConfig {
  key: string;
  title: string;
  path: string;
  icon?: string;
  permission?: string;
  children?: MenuItemConfig[];
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  city?: string;
  [key: string]: unknown;
}

export interface PageResult<T> {
  list: T[];
  total: number;
}

export interface BasicRecord {
  id: string;
  no: string;
  name: string;
  city: string;
  status: string;
  owner: string;
  createdAt: string;
  tags?: string[];
  amount?: number;
  remark?: string;
  [key: string]: unknown;
}

export interface BookingRecord {
  id: string;
  orderNo: string;
  customerName: string;
  sceneName: string;
  city: string;
  serviceTime: string;
  assistantCount: number;
  amount: number;
  status: string;
  manager: string;
  riskLevel: string;
  timeline: Array<{
    status: string;
    title: string;
    time: string;
    operator: string;
    note?: string;
  }>;
}

export interface AssistantRecord {
  id: string;
  assistantNo: string;
  workName: string;
  city: string;
  status: string;
  publicProfileStatus: string;
  publicProfile: {
    avatarUrl: string;
    imageAuditStatus: string;
    styleTags: string[];
    sceneSkills: string[];
    businessSkills: string[];
    publicIntro: string;
  };
  internalProfile: {
    realName: string;
    phoneMasked: string;
    idNumberMasked: string;
    internalTags: string[];
    internalNote: string;
    trainingRecords: string[];
  };
}

export interface MealBriefRecord {
  id: string;
  orderId?: string;
  bookingNo: string;
  customerName: string;
  sceneName: string;
  city?: string;
  serviceTime?: string;
  assistantCount?: number;
  status: string;
  banquetTheme?: string;
  customerBackground?: string;
  diningPurpose?: string;
  attendeeCount?: number;
  guestIdentities?: string[];
  atmosphereNeeds?: string;
  tabooTopics?: string[];
  recommendedTopics?: string[];
  dressCode?: string;
  roleAssignments?: Array<{
    role: string;
    owner: string;
    responsibility: string;
  }>;
  attentionPoints?: string[];
  managerPrivateNote: string;
  assistantVisibleBrief: string;
  tasks?: Array<{
    id: string;
    title: string;
    detail?: string;
    role?: string;
    status: string;
    sortOrder: number;
  }>;
  review?: {
    customerFeedback?: string;
    assistantFeedback?: string;
    internalSummary?: string;
    rating?: number;
  };
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  assistantConfirmedBy?: string;
  assistantConfirmedAt?: string;
  reminderAt?: string;
  updatedAt: string;
}

export interface FinanceRecord {
  id: string;
  no: string;
  type: 'payment' | 'refund' | 'settlement';
  orderNo: string;
  subject: string;
  amount: number;
  status: string;
  provider?: string;
  createdAt: string;
}

export interface ApprovalRecord {
  id: string;
  approvalNo: string;
  bizType: string;
  title: string;
  applicant: string;
  status: string;
  amount?: number;
  createdAt: string;
  remark?: string;
}

export interface AuditLogRecord {
  id: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ip: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface SensitiveWordRecord {
  id: string;
  keyword: string;
  category: string;
  level: string;
  status: string;
  hitCount: number;
  note?: string;
  updatedAt: string;
}

export interface PublicProfileReviewRecord {
  id: string;
  assistantNo: string;
  workName: string;
  status: string;
  imageAuditStatus: string;
  riskLevel: string;
  findings: Array<{ keyword: string; category: string; level: string }>;
  contentSnapshot: Record<string, unknown>;
  rejectionReason?: string;
  updatedAt: string;
}

export interface ComplaintRecord {
  id: string;
  complaintNo: string;
  orderNo?: string;
  complainantType: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  handler?: string;
  resolution?: string;
  createdAt: string;
}

export interface BlacklistRecord {
  id: string;
  subjectType: string;
  subjectName: string;
  reason: string;
  status: string;
  expiredAt?: string;
  createdAt: string;
}

export interface OrderExceptionRecord {
  id: string;
  exceptionNo: string;
  orderNo: string;
  category: string;
  riskLevel: string;
  status: string;
  summary: string;
  handler?: string;
  createdAt: string;
}

export interface RiskReportSummary {
  pendingProfileReviews: number;
  pendingComplaints: number;
  activeBlacklist: number;
  openExceptions: number;
  highRiskEvents: number;
}

export interface RiskDetectionResult {
  safe: boolean;
  level: string;
  sanitizedText: string;
  hits: Array<{
    keyword: string;
    category: string;
    level: string;
    sample: string;
  }>;
}
