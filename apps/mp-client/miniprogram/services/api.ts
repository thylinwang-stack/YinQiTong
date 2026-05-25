import { request, getApiMode } from './http';
import { mockService } from './mock-service';
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
  ServicePackage,
  ServiceScene
} from './types';

export const api = {
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
    return request<CreateBookingResult>({ url: '/bookings', method: 'POST', data: input });
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
    return request<CreatePaymentResult>({ url: `/orders/${orderId}/payments`, method: 'POST', data: { provider: 'wechat_pay' } });
  },

  markOrderPaid(orderId: string): Promise<BookingOrder | undefined> {
    return getApiMode() === 'mock' ? mockService.markOrderPaid(orderId) : api.getOrder(orderId);
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

export function requestPayment(params: CreatePaymentResult): Promise<void> {
  if (params.provider === 'mock') {
    return new Promise(resolve => setTimeout(resolve, 600));
  }

  return new Promise((resolve, reject) => {
    wx.requestPayment({
      ...params.paymentParams,
      success: () => resolve(),
      fail: reject
    });
  });
}
