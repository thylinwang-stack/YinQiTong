import { BookingStatus } from '../services/types';

export const formatMoney = (value: number): string => `¥${Number(value || 0).toFixed(0)}`;

export const bookingStatusText: Record<BookingStatus, string> = {
  pending_payment: '待支付预约金',
  pending_match: '待匹配',
  matched: '已匹配',
  brief_preparing: '餐前准备中',
  ready_for_service: '待服务',
  in_service: '服务中',
  completed: '已完成',
  cancelled: '已取消'
};
