import {
  AssistantFilters,
  AssistantPublicProfile,
  BookingDraft,
  BookingOrder,
  CreateBookingResult,
  CreatePaymentResult,
  ProtocolConfirmationInput,
  StaffMealBrief,
  StaffReviewInput,
  SupportRequestType,
  ServicePackage,
  ServiceScene
} from './types';
import { assistants, mockOrders, packages, scenes, staffMealBriefs } from './mock-data';

const ORDERS_STORAGE_KEY = 'business_concierge_mock_orders';

const delay = <T>(value: T, ms = 240): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(value), ms));

let orders = readStoredOrders();
let briefs = [...staffMealBriefs];

function readStoredOrders(): BookingOrder[] {
  const stored = wx.getStorageSync(ORDERS_STORAGE_KEY);
  return Array.isArray(stored) && stored.length ? stored : [...mockOrders];
}

function persistOrders() {
  wx.setStorageSync(ORDERS_STORAGE_KEY, orders);
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
      const matchScene = !filters.scene || item.sceneSkills.includes(filters.scene);
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
      serviceTime: `${draft.date} ${draft.time}`,
      assistantCount: draft.assistantCount,
      depositAmount: pkg?.depositAmount || Math.max(300, Math.round(draft.budget * 0.2)),
      serviceFee: pkg?.serviceFee || draft.budget,
      paidAmount: 0,
      createdAt: new Date().toLocaleString(),
      boundaryConfirmed: true
    };
    orders = [order, ...orders];
    persistOrders();
    return delay({ bookingId: `booking_${Date.now()}`, order });
  },

  getMyOrders(): Promise<BookingOrder[]> {
    return delay(orders);
  },

  getOrder(id: string): Promise<BookingOrder | undefined> {
    return delay(orders.find(item => item.id === id || item.orderNo === id));
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
      add_requirement: '补充需求已记录，运营会同步给匹配与 brief 流程。'
    };
    return delay({ accepted: true, message: messageMap[type] });
  },

  getStaffMealBrief(id: string): Promise<StaffMealBrief | undefined> {
    return delay(briefs.find(item => item.id === id || item.orderNo === id));
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

  confirmServiceBoundary(_input: ProtocolConfirmationInput): Promise<{ confirmed: true }> {
    return delay({ confirmed: true });
  }
};
