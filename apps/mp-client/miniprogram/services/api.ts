import { request, getApiMode } from './http';
import { mockService } from './mock-service';
import {
  AssistantFilters,
  AssistantPublicProfile,
  BookingDraft,
  BookingOrder,
  CreateBookingResult,
  CreatePaymentResult,
  LoginResult,
  ProtocolConfirmationInput,
  StaffMealBrief,
  StaffReviewInput,
  SupportRequestType,
  ServicePackage,
  ServiceScene
} from './types';

export const api = {
  loginWithWechat(profile?: { nickname?: string; avatarUrl?: string }): Promise<LoginResult> {
    if (getApiMode() === 'mock') {
      const result: LoginResult = {
        token: 'mock_customer_token',
        openid: 'mock_openid',
        user: { id: 'mock_user', name: profile?.nickname || '商务客户', userType: 'customer', permissions: [] }
      };
      wx.setStorageSync('token', result.token);
      wx.setStorageSync('user', result.user);
      return Promise.resolve(result);
    }
    return new Promise((resolve, reject) => {
      wx.login({
        success: async loginRes => {
          try {
            if (!loginRes.code) {
              reject(new Error('微信登录未返回 code'));
              return;
            }
            const result = await request<LoginResult>({
              url: '/auth/wechat/login',
              method: 'POST',
              data: { code: loginRes.code, ...profile }
            });
            wx.setStorageSync('token', result.token);
            wx.setStorageSync('user', result.user);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        fail: reject
      });
    });
  },

  getScenes(): Promise<ServiceScene[]> {
    return getApiMode() === 'mock' ? mockService.getScenes() : request<ServiceScene[]>({ url: '/service-scenes', method: 'GET' });
  },

  getPackages(sceneId?: string): Promise<ServicePackage[]> {
    if (getApiMode() === 'mock') return mockService.getPackages(sceneId);
    return request<ServicePackage[]>({ url: `/packages${sceneId ? `?sceneId=${sceneId}` : ''}`, method: 'GET' });
  },

  getAssistants(filters: AssistantFilters): Promise<AssistantPublicProfile[]> {
    if (getApiMode() === 'mock') return mockService.getAssistants(filters);
    return request<AssistantPublicProfile[]>({ url: '/assistants/public', method: 'GET', data: filters });
  },

  getAssistant(id: string): Promise<AssistantPublicProfile | undefined> {
    if (getApiMode() === 'mock') return mockService.getAssistant(id);
    return request<AssistantPublicProfile>({ url: `/assistants/public/${id}`, method: 'GET' });
  },

  createBooking(input: BookingDraft): Promise<CreateBookingResult> {
    if (getApiMode() === 'mock') return mockService.createBooking(input);
    return request<CreateBookingResult>({ url: '/bookings', method: 'POST', data: toBackendBookingPayload(input) });
  },

  getMyOrders(): Promise<BookingOrder[]> {
    return getApiMode() === 'mock' ? mockService.getMyOrders() : request<BookingOrder[]>({ url: '/bookings/my', method: 'GET' });
  },

  getOrder(id: string): Promise<BookingOrder | undefined> {
    if (getApiMode() === 'mock') return mockService.getOrder(id);
    return request<BookingOrder>({ url: `/bookings/${id}`, method: 'GET' });
  },

  createPayment(orderId: string): Promise<CreatePaymentResult> {
    if (getApiMode() === 'mock') return mockService.createPayment(orderId);
    return request<CreatePaymentResult>({ url: `/orders/${orderId}/payments`, method: 'POST', data: { provider: 'wechat_pay' } })
      .then(result => ({
        ...result,
        paymentParams: result.paymentParams || result.requestPaymentParams
      }));
  },

  markOrderPaid(orderId: string): Promise<BookingOrder | undefined> {
    return getApiMode() === 'mock' ? mockService.markOrderPaid(orderId) : api.getOrder(orderId);
  },

  cancelOrder(orderId: string, reason?: string): Promise<BookingOrder | undefined> {
    if (getApiMode() === 'mock') return mockService.cancelOrder(orderId, reason);
    return request<{ order: unknown }>({
      url: `/orders/${orderId}/cancel`,
      method: 'POST',
      data: { reason, actorType: 'customer' }
    }).then(() => api.getOrder(orderId));
  },

  requestOrderSupport(orderId: string, type: SupportRequestType, content?: string): Promise<{ accepted: boolean; message: string }> {
    if (getApiMode() === 'mock') return mockService.requestOrderSupport(orderId, type, content);
    return request<{ accepted: boolean; message: string }>({
      url: `/bookings/${orderId}/support-requests`,
      method: 'POST',
      data: { type, content }
    });
  },

  getStaffMealBrief(id: string): Promise<StaffMealBrief | undefined> {
    if (getApiMode() === 'mock') return mockService.getStaffMealBrief(id);
    return request<StaffMealBrief>({ url: `/staff/meal-briefs/${id}`, method: 'GET' });
  },

  confirmStaffMealBrief(id: string): Promise<StaffMealBrief | undefined> {
    if (getApiMode() === 'mock') return mockService.confirmStaffMealBrief(id);
    return request<StaffMealBrief>({ url: `/staff/meal-briefs/${id}/confirm`, method: 'POST', data: {} });
  },

  updateStaffTask(briefId: string, taskId: string, checked: boolean): Promise<StaffMealBrief | undefined> {
    if (getApiMode() === 'mock') return mockService.updateStaffTask(briefId, taskId, checked);
    return request<StaffMealBrief>({ url: `/staff/meal-briefs/${briefId}/tasks/${taskId}`, method: 'PATCH', data: { checked } });
  },

  submitStaffReview(id: string, input: StaffReviewInput): Promise<StaffMealBrief | undefined> {
    if (getApiMode() === 'mock') return mockService.submitStaffReview(id, input);
    return request<StaffMealBrief>({ url: `/staff/meal-briefs/${id}/review`, method: 'POST', data: input });
  },

  confirmServiceBoundary(input: ProtocolConfirmationInput): Promise<{ confirmed: boolean }> {
    if (getApiMode() === 'mock') return mockService.confirmServiceBoundary(input);
    return request<{ confirmed: boolean }>({ url: '/protocol-confirmations', method: 'POST', data: input });
  }
};

export async function ensureCustomerLogin(): Promise<void> {
  if (wx.getStorageSync('token')) return;
  await api.loginWithWechat();
}

function toBackendBookingPayload(input: BookingDraft) {
  const extra = [
    ['客户角色', input.hostRole],
    ['饭局目标', input.banquetGoal],
    ['嘉宾背景', input.guestProfile],
    ['餐厅/包间偏好', input.venuePreference],
    ['联系人', input.contactName],
    ['联系电话', input.contactPhone],
    ['助理风格', input.preferredAssistantStyle],
    ['隐私级别', input.privacyLevel],
    ['着装要求', input.dressCode],
    ['语言要求', input.languageRequirement],
    ['到场安排', input.arrivalPlan],
    ['可回访时段', input.callbackWindow]
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}：${value}`)
    .join('\n');

  return {
    city: input.city,
    date: input.date,
    time: input.time,
    dinnerType: input.dinnerType,
    guestCount: input.guestCount,
    assistantCount: input.assistantCount,
    budget: input.budget,
    preference: clip(joinLines([input.preference, input.preferredAssistantStyle ? `偏好风格：${input.preferredAssistantStyle}` : '']), 500),
    taboos: clip(joinLines([input.taboos, input.privacyLevel ? `隐私级别：${input.privacyLevel}` : '']), 500),
    remark: clip(joinLines([input.remark, extra]), 1000),
    sceneId: input.sceneId,
    packageId: input.packageId,
    boundaryAgreementConfirmed: input.boundaryAgreementConfirmed,
    protocolVersion: input.protocolVersion
  };
}

function joinLines(values: Array<string | undefined>): string {
  return values.map(item => (item || '').trim()).filter(Boolean).join('\n');
}

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

export function requestPayment(params: CreatePaymentResult): Promise<void> {
  if (params.provider === 'mock') {
    return new Promise(resolve => setTimeout(resolve, 600));
  }
  const paymentParams = params.paymentParams || params.requestPaymentParams;
  if (!paymentParams) {
    return Promise.reject(new Error('缺少微信支付参数'));
  }

  return new Promise((resolve, reject) => {
    wx.requestPayment({
      ...paymentParams,
      success: () => resolve(),
      fail: reject
    });
  });
}
