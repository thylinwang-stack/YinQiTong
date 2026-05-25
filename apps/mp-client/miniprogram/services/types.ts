export type ApiMode = 'mock' | 'real';

export type SceneCode = 'business_dinner' | 'client_reception' | 'city_visit' | 'project_meeting' | 'private_gathering';

export interface ServiceScene {
  id: string;
  code: SceneCode;
  name: string;
  summary: string;
  description: string;
  cover: string;
  tags: string[];
  serviceScope: string[];
}

export interface ServicePackage {
  id: string;
  sceneId: string;
  name: string;
  subtitle: string;
  durationHours: number;
  assistantCount: number;
  depositAmount: number;
  serviceFee: number;
  includes: string[];
}

export interface AssistantPublicProfile {
  id: string;
  assistantNo: string;
  workName: string;
  city: string;
  avatarUrl: string;
  styleTags: string[];
  sceneSkills: string[];
  businessSkills: string[];
  intro: string;
  complianceNote: string;
}

export interface AssistantFilters {
  city?: string;
  scene?: string;
  styleTag?: string;
}

export interface BookingDraft {
  city: string;
  date: string;
  time: string;
  dinnerType: string;
  guestCount: number;
  assistantCount: number;
  budget: number;
  preference: string;
  taboos: string;
  remark: string;
  sceneId?: string;
  packageId?: string;
  boundaryAgreementConfirmed?: boolean;
  protocolVersion?: string;
}

export interface BookingOrder {
  id: string;
  orderNo: string;
  status: BookingStatus;
  sceneName: string;
  city: string;
  serviceTime: string;
  assistantCount: number;
  depositAmount: number;
  serviceFee: number;
  paidAmount: number;
  createdAt: string;
  boundaryConfirmed: boolean;
}

export type BookingStatus =
  | 'pending_payment'
  | 'pending_match'
  | 'matched'
  | 'brief_preparing'
  | 'ready_for_service'
  | 'in_service'
  | 'completed'
  | 'cancelled';

export interface CreateBookingResult {
  bookingId: string;
  order: BookingOrder;
}

export interface PaymentParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'MD5' | 'HMAC-SHA256' | 'RSA';
  paySign: string;
}

export interface CreatePaymentResult {
  paymentNo: string;
  provider: 'mock' | 'wechat_pay';
  amount: number;
  paymentParams: PaymentParams;
}

export interface PaymentResultState {
  orderNo: string;
  status: 'success' | 'failed' | 'cancelled';
  message: string;
}

export type MealBriefStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'assistant_confirmed'
  | 'reminder_sent'
  | 'reviewed';

export interface AssistantBriefTask {
  id: string;
  title: string;
  detail?: string;
  role?: string;
  status: 'pending' | 'confirmed' | 'done' | 'skipped';
  sortOrder: number;
}

export interface StaffMealBrief {
  id: string;
  orderId?: string;
  orderNo: string;
  status: MealBriefStatus;
  banquetTheme: string;
  sceneName: string;
  city: string;
  serviceTime: string;
  attendeeCount: number;
  dressCode: string;
  assistantVisibleBrief: string;
  recommendedTopics: string[];
  tabooTopics: string[];
  roleAssignments: Array<{
    role: string;
    owner: string;
    responsibility: string;
  }>;
  attentionPoints: string[];
  tasks: AssistantBriefTask[];
}

export interface StaffReviewInput {
  assistantFeedback: string;
}

export interface ProtocolConfirmationInput {
  orderId: string;
  actorType: 'customer' | 'assistant';
  protocolVersion?: string;
}
