export type ApiMode = 'mock' | 'real';

export type SceneCode =
  | 'business_dinner'
  | 'private_tea'
  | 'wine_reception'
  | 'golf_social'
  | 'city_concierge'
  | 'closed_salon'
  | 'art_preview'
  | 'tennis_social'
  | 'brand_private_event';

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
  talents?: string[];
  intro: string;
  complianceNote: string;
  recommendReason?: string;
}

export interface ReviewAssistantSummary {
  assistantId: string;
  assistantNo: string;
  workName: string;
  city?: string;
  avatarUrl?: string;
  styleTags?: string[];
  sceneSkills?: string[];
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
  hostRole?: string;
  banquetGoal?: string;
  guestProfile?: string;
  district?: string;
  venueType?: string;
  meetingPoint?: string;
  arrivalWindow?: string;
  transportNote?: string;
  venuePreference?: string;
  contactName?: string;
  contactPhone?: string;
  preferredAssistantStyle?: string;
  privacyLevel?: string;
  dressCode?: string;
  languageRequirement?: string;
  arrivalPlan?: string;
  callbackWindow?: string;
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
  district?: string;
  venueType?: string;
  meetingPoint?: string;
  arrivalWindow?: string;
  serviceTime: string;
  assistantCount: number;
  depositAmount: number;
  serviceFee: number;
  paidAmount: number;
  createdAt: string;
  boundaryConfirmed: boolean;
  reviewStatus?: ServiceReviewStatus;
  reviewToken?: string;
  reviewSubmittedAt?: string;
  assistants?: ReviewAssistantSummary[];
}

export type BookingStatus =
  | 'pending_payment'
  | 'pending_match'
  | 'matched'
  | 'brief_preparing'
  | 'ready_for_service'
  | 'in_service'
  | 'completed'
  | 'reviewed'
  | 'cancelled';

export type ServiceReviewStatus = 'not_available' | 'pending' | 'submitted';

export interface AssistantServiceReviewInput {
  assistantId: string;
  assistantNo: string;
  rating: number;
  comment?: string;
}

export interface ServiceReviewSubmitInput {
  overallRating: number;
  atmosphereRating: number;
  professionalismRating: number;
  boundarySenseRating: number;
  punctualityRating: number;
  assistantReviews: AssistantServiceReviewInput[];
  highlightTags: string[];
  comment?: string;
  allowFollowUp?: boolean;
  repurchaseIntent?: 'yes' | 'maybe' | 'no';
}

export interface ServiceReview extends ServiceReviewSubmitInput {
  id: string;
  orderId: string;
  orderNo: string;
  status: ServiceReviewStatus;
  sceneName: string;
  city: string;
  serviceTime: string;
  assistantCount: number;
  assistants: ReviewAssistantSummary[];
  reviewToken: string;
  shareTitle: string;
  sharePath: string;
  submittedAt?: string;
}

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
  subject?: string;
  paymentParams?: PaymentParams;
  requestPaymentParams?: PaymentParams;
}

export interface PaymentResultState {
  orderNo: string;
  status: 'success' | 'failed' | 'cancelled';
  message: string;
}

export type SupportRequestType =
  | 'contact_service'
  | 'reschedule'
  | 'cancel'
  | 'refund'
  | 'invoice'
  | 'add_requirement';

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

export interface StaffWorkItem {
  id: string;
  briefId: string;
  orderNo: string;
  sceneName: string;
  city: string;
  serviceTime: string;
  banquetTheme: string;
  status: MealBriefStatus;
  taskTotal: number;
  taskDone: number;
  checkInStatus: 'not_started' | 'checked_in' | 'checked_out';
  settlementStatus: 'pending' | 'processing' | 'settled';
  boundaryConfirmed: boolean;
}

export type StaffCheckInAction = 'check_in' | 'check_out';

export interface StaffReviewInput {
  assistantFeedback: string;
}

export interface ProtocolConfirmationInput {
  orderId: string;
  actorType: 'customer' | 'assistant';
  protocolVersion?: string;
}

export interface LoginResult {
  token: string;
  openid?: string;
  user: {
    id: string;
    name: string;
    userType: string;
    permissions: string[];
  };
}
