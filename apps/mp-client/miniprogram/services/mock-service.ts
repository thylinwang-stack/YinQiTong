import {
  AssistantFilters,
  AssistantPublicProfile,
  BookingDraft,
  BookingOrder,
  CreateBookingResult,
  CreatePaymentResult,
  ProtocolConfirmationInput,
  ReviewAssistantSummary,
  ServiceReview,
  ServiceReviewSubmitInput,
  StaffCheckInAction,
  StaffMealBrief,
  StaffWorkItem,
  StaffReviewInput,
  SupportRequestType,
  ServicePackage,
  ServiceScene
} from './types';
import { assistants, mockOrders, packages, scenes, staffMealBriefs } from './mock-data';

const ORDERS_STORAGE_KEY = 'business_concierge_mock_orders';
const REVIEWS_STORAGE_KEY = 'business_concierge_mock_service_reviews';

const delay = <T>(value: T, ms = 240): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(value), ms));

let orders = readStoredOrders();
let serviceReviews = readStoredReviews();
let briefs = [...staffMealBriefs];
let staffCheckIns: Record<string, StaffWorkItem['checkInStatus']> = {};

const primaryAssistantPrefixes: Record<string, string> = {
  商务宴请: 'ast_business_',
  私人茶会: 'ast_tea_',
  高端酒会: 'ast_wine_',
  高尔夫商务同场: 'ast_golf_',
  城市临时管家: 'ast_city_',
  闭门沙龙: 'ast_business_',
  艺术展览: 'ast_tea_',
  运动社交: 'ast_golf_',
  品牌私享会: 'ast_wine_'
};

function readStoredOrders(): BookingOrder[] {
  const stored = wx.getStorageSync(ORDERS_STORAGE_KEY);
  const source = Array.isArray(stored) && stored.length ? stored : [...mockOrders];
  return source.map(normalizeOrderReviewState);
}

function persistOrders() {
  wx.setStorageSync(ORDERS_STORAGE_KEY, orders);
}

function readStoredReviews(): ServiceReview[] {
  const stored = wx.getStorageSync(REVIEWS_STORAGE_KEY);
  return Array.isArray(stored) ? stored : [];
}

function persistReviews() {
  wx.setStorageSync(REVIEWS_STORAGE_KEY, serviceReviews);
}

function isReviewableStatus(status: BookingOrder['status']): boolean {
  return status === 'completed' || status === 'reviewed';
}

function normalizeOrderReviewState(order: BookingOrder): BookingOrder {
  const reviewToken = order.reviewToken || `review_${order.orderNo}`;
  const submitted = order.status === 'reviewed' || order.reviewStatus === 'submitted';
  return {
    ...order,
    reviewToken,
    reviewStatus: isReviewableStatus(order.status) ? (submitted ? 'submitted' : 'pending') : 'not_available',
    assistants: order.assistants || buildAssistantSummaries(order.assistantCount)
  };
}

function buildAssistantSummaries(count: number): ReviewAssistantSummary[] {
  const safeCount = Math.max(1, Math.min(count || 1, assistants.length));
  return assistants.slice(0, safeCount).map(item => ({
    assistantId: item.id,
    assistantNo: item.assistantNo,
    workName: item.workName,
    city: item.city,
    avatarUrl: item.avatarUrl,
    styleTags: item.styleTags,
    sceneSkills: item.sceneSkills
  }));
}

function buildReviewSharePath(order: BookingOrder): string {
  const token = order.reviewToken || `review_${order.orderNo}`;
  return `/pages/service-review/index?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(token)}`;
}

function toEmptyReview(order: BookingOrder): ServiceReview {
  const normalized = normalizeOrderReviewState(order);
  return {
    id: `srv_${normalized.orderNo}`,
    orderId: normalized.id,
    orderNo: normalized.orderNo,
    status: normalized.reviewStatus || 'not_available',
    sceneName: normalized.sceneName,
    city: normalized.city,
    serviceTime: normalized.serviceTime,
    assistantCount: normalized.assistantCount,
    assistants: normalized.assistants || [],
    reviewToken: normalized.reviewToken || `review_${normalized.orderNo}`,
    shareTitle: `请评价 ${normalized.orderNo} 服务体验`,
    sharePath: buildReviewSharePath(normalized),
    overallRating: 0,
    atmosphereRating: 0,
    professionalismRating: 0,
    boundarySenseRating: 0,
    punctualityRating: 0,
    assistantReviews: (normalized.assistants || []).map(item => ({
      assistantId: item.assistantId,
      assistantNo: item.assistantNo,
      rating: 0,
      comment: ''
    })),
    highlightTags: [],
    comment: '',
    allowFollowUp: true
  };
}

function findOrderForReview(orderId: string, token?: string): BookingOrder {
  const order = orders.find(item => item.id === orderId || item.orderNo === orderId);
  if (!order) throw new Error('订单不存在');
  const normalized = normalizeOrderReviewState(order);
  if (token && normalized.reviewToken !== token) {
    throw new Error('评价链接已失效，请联系平台客服重新发送');
  }
  return normalized;
}

export const mockService = {
  getScenes(): Promise<ServiceScene[]> {
    return delay(scenes);
  },

  getPackages(sceneId?: string): Promise<ServicePackage[]> {
    return delay(sceneId ? packages.filter(item => item.sceneId === sceneId) : packages);
  },

  getAssistants(filters: AssistantFilters = {}): Promise<AssistantPublicProfile[]> {
    const result = assistants.filter(item => {
      const matchCity = !filters.city || item.city === filters.city;
      const primaryPrefix = filters.scene ? primaryAssistantPrefixes[filters.scene] : undefined;
      const matchScene = !filters.scene || (primaryPrefix ? item.id.startsWith(primaryPrefix) : item.sceneSkills.includes(filters.scene));
      const matchTag = !filters.styleTag || item.styleTags.includes(filters.styleTag);
      return matchCity && matchScene && matchTag;
    });
    return delay(result);
  },

  getAssistant(id: string): Promise<AssistantPublicProfile | undefined> {
    return delay(assistants.find(item => item.id === id));
  },

  createBooking(draft: BookingDraft): Promise<CreateBookingResult> {
    if (!draft.boundaryAgreementConfirmed) {
      return Promise.reject(new Error('请先确认服务边界协议'));
    }
    const scene = scenes.find(item => item.id === draft.sceneId) || scenes[0];
    const pkg = packages.find(item => item.id === draft.packageId);
    const order: BookingOrder = {
      id: `ord_${Date.now()}`,
      orderNo: `BS${Date.now().toString().slice(-10)}`,
      status: 'pending_payment',
      sceneName: scene.name || draft.dinnerType,
      city: draft.city,
      district: draft.district,
      venueType: draft.venueType,
      meetingPoint: draft.meetingPoint,
      arrivalWindow: draft.arrivalWindow,
      serviceTime: `${draft.date} ${draft.time}`,
      assistantCount: draft.assistantCount,
      depositAmount: pkg?.depositAmount || Math.max(300, Math.round(draft.budget * 0.2)),
      serviceFee: pkg?.serviceFee || draft.budget,
      paidAmount: 0,
      createdAt: new Date().toLocaleString(),
      boundaryConfirmed: true,
      reviewStatus: 'not_available',
      reviewToken: `review_${Date.now()}`,
      assistants: []
    };
    orders = [order, ...orders];
    persistOrders();
    return delay({ bookingId: `booking_${Date.now()}`, order });
  },

  getMyOrders(): Promise<BookingOrder[]> {
    orders = orders.map(normalizeOrderReviewState);
    persistOrders();
    return delay(orders);
  },

  getOrder(id: string): Promise<BookingOrder | undefined> {
    const order = orders.find(item => item.id === id || item.orderNo === id);
    return delay(order ? normalizeOrderReviewState(order) : undefined);
  },

  createPayment(orderId: string): Promise<CreatePaymentResult> {
    const order = orders.find(item => item.id === orderId || item.orderNo === orderId);
    if (!order) {
      return Promise.reject(new Error('订单不存在'));
    }
    return delay({
      paymentNo: `PAY${Date.now()}`,
      provider: 'mock',
      amount: order.depositAmount,
      paymentParams: {
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: `mock_${Date.now()}`,
        package: `prepay_id=mock_${order.orderNo}`,
        signType: 'RSA',
        paySign: 'mock_pay_sign'
      }
    });
  },

  markOrderPaid(orderId: string): Promise<BookingOrder | undefined> {
    orders = orders.map(item =>
      item.id === orderId || item.orderNo === orderId
        ? { ...item, status: 'pending_match', paidAmount: item.depositAmount }
        : item
    );
    persistOrders();
    return this.getOrder(orderId);
  },

  cancelOrder(orderId: string, reason?: string): Promise<BookingOrder | undefined> {
    orders = orders.map(item =>
      item.id === orderId || item.orderNo === orderId
        ? {
            ...item,
            status: 'cancelled',
            boundaryConfirmed: item.boundaryConfirmed
          }
        : item
    );
    persistOrders();
    return this.getOrder(orderId);
  },

  requestOrderSupport(_orderId: string, type: SupportRequestType, _content?: string): Promise<{ accepted: true; message: string }> {
    const messageMap: Record<SupportRequestType, string> = {
      contact_service: '客服请求已记录，平台将在服务时段前与你确认。',
      reschedule: '改期申请已记录，客服会确认档期与费用差异。',
      cancel: '取消申请已记录，请等待客服确认可退金额。',
      refund: '退款申请已记录，请等待客服核对支付状态。',
      invoice: '发票申请已记录，客服会与你确认抬头信息。',
      add_requirement: '补充需求已记录，运营会同步给匹配与简报流程。'
    };
    return delay({ accepted: true, message: messageMap[type] });
  },

  getServiceReview(orderId: string, token?: string): Promise<ServiceReview> {
    const order = findOrderForReview(orderId, token);
    const existing = serviceReviews.find(item => item.orderId === order.id || item.orderNo === order.orderNo);
    return delay(existing || toEmptyReview(order));
  },

  submitServiceReview(orderId: string, input: ServiceReviewSubmitInput, token?: string): Promise<ServiceReview> {
    const order = findOrderForReview(orderId, token);
    if (!isReviewableStatus(order.status)) {
      return Promise.reject(new Error('服务完成后才可以提交评价'));
    }

    const existing = serviceReviews.find(item => item.orderId === order.id || item.orderNo === order.orderNo);
    if (existing?.status === 'submitted') {
      return delay(existing);
    }

    const base = existing || toEmptyReview(order);
    const submitted: ServiceReview = {
      ...base,
      ...input,
      status: 'submitted',
      submittedAt: new Date().toLocaleString()
    };
    serviceReviews = [submitted, ...serviceReviews.filter(item => item.id !== submitted.id)];
    orders = orders.map(item =>
      item.id === order.id || item.orderNo === order.orderNo
        ? { ...normalizeOrderReviewState(item), status: 'reviewed', reviewStatus: 'submitted', reviewSubmittedAt: submitted.submittedAt }
        : item
    );
    persistReviews();
    persistOrders();
    return delay(submitted);
  },

  getStaffMealBrief(id: string): Promise<StaffMealBrief | undefined> {
    return delay(briefs.find(item => item.id === id || item.orderNo === id));
  },

  listStaffWorkItems(): Promise<StaffWorkItem[]> {
    const items = briefs.map((brief, index) => {
      const taskTotal = brief.tasks.length;
      const taskDone = brief.tasks.filter(task => task.status === 'done').length;
      return {
        id: `work_${brief.id}`,
        briefId: brief.id,
        orderNo: brief.orderNo,
        sceneName: brief.sceneName,
        city: brief.city,
        serviceTime: brief.serviceTime,
        banquetTheme: brief.banquetTheme,
        status: brief.status,
        taskTotal,
        taskDone,
        checkInStatus: staffCheckIns[brief.id] || (index === 0 ? 'not_started' : 'checked_out'),
        settlementStatus: index === 0 ? 'pending' : 'processing',
        boundaryConfirmed: brief.status === 'assistant_confirmed' || brief.status === 'reviewed'
      } as StaffWorkItem;
    });
    return delay(items);
  },

  confirmStaffMealBrief(id: string): Promise<StaffMealBrief | undefined> {
    briefs = briefs.map(item =>
      item.id === id || item.orderNo === id
        ? { ...item, status: 'assistant_confirmed' }
        : item
    );
    return this.getStaffMealBrief(id);
  },

  updateStaffTask(briefId: string, taskId: string, checked: boolean): Promise<StaffMealBrief | undefined> {
    briefs = briefs.map(brief =>
      brief.id === briefId || brief.orderNo === briefId
        ? {
            ...brief,
            tasks: brief.tasks.map(task => task.id === taskId ? { ...task, status: checked ? 'done' : 'pending' } : task)
          }
        : brief
    );
    return this.getStaffMealBrief(briefId);
  },

  submitStaffReview(id: string, _input: StaffReviewInput): Promise<StaffMealBrief | undefined> {
    return this.getStaffMealBrief(id);
  },

  checkInStaffWorkItem(id: string, action: StaffCheckInAction): Promise<{ accepted: true }> {
    staffCheckIns = {
      ...staffCheckIns,
      [id]: action === 'check_out' ? 'checked_out' : 'checked_in'
    };
    return delay({ accepted: true });
  },

  confirmServiceBoundary(_input: ProtocolConfirmationInput): Promise<{ confirmed: true }> {
    return delay({ confirmed: true });
  }
};
