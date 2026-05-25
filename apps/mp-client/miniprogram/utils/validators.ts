import { BookingDraft } from '../services/types';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateBookingDraft(input: BookingDraft): ValidationResult {
  if (!input.city) return { valid: false, message: '请选择服务城市' };
  if (!input.date) return { valid: false, message: '请选择服务日期' };
  if (!input.time) return { valid: false, message: '请选择开始时间' };
  if (!input.dinnerType) return { valid: false, message: '请选择饭局类型' };
  if (!input.guestCount || input.guestCount < 1) return { valid: false, message: '请填写到场人数' };
  if (!input.assistantCount || input.assistantCount < 1) return { valid: false, message: '请填写商务助理人数' };
  if (!input.budget || input.budget < 300) return { valid: false, message: '预算需不低于 300 元' };
  if (input.preference && input.preference.length > 120) return { valid: false, message: '偏好描述请控制在 120 字内' };
  if (input.taboos && input.taboos.length > 120) return { valid: false, message: '禁忌说明请控制在 120 字内' };
  if (input.remark && input.remark.length > 200) return { valid: false, message: '备注请控制在 200 字内' };
  return { valid: true };
}

export function assertBoundaryChecked(checked: boolean): ValidationResult {
  if (!checked) {
    return { valid: false, message: '请先确认服务边界协议' };
  }
  return { valid: true };
}

export function assertAssistantBoundaryChecked(checked: boolean): ValidationResult {
  if (!checked) {
    return { valid: false, message: '商务助理需先确认服务边界协议' };
  }
  return { valid: true };
}
