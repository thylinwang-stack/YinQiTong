import { BookingDraft } from '../services/types';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateBookingDraft(input: BookingDraft): ValidationResult {
  for (let step = 0; step <= 2; step += 1) {
    const result = validateBookingStep(input, step);
    if (!result.valid) return result;
  }
  return { valid: true };
}

export function validateBookingStep(input: BookingDraft, step: number): ValidationResult {
  if (step === 0) {
    if (!input.city) return { valid: false, message: '请选择服务城市' };
    if (!input.date) return { valid: false, message: '请选择服务日期' };
    if (!input.time) return { valid: false, message: '请选择开始时间' };
    if (!isFutureServiceTime(input.date, input.time)) return { valid: false, message: '服务时间需要晚于当前时间' };
    if (!input.dinnerType) return { valid: false, message: '请选择饭局类型' };
    if (!input.guestCount || input.guestCount < 1) return { valid: false, message: '请填写到场人数' };
    if (input.guestCount > 80) return { valid: false, message: '到场人数超过 80 人建议由客服专项跟进' };
    if (!input.assistantCount || input.assistantCount < 1) return { valid: false, message: '请填写商务助理人数' };
    if (input.assistantCount > 8) return { valid: false, message: '助理人数超过 8 人建议由客服专项跟进' };
    if (!input.budget || input.budget < 300) return { valid: false, message: '预算需不低于 300 元' };
    return { valid: true };
  }

  if (step === 1) {
    if (!trimmed(input.hostRole)) return { valid: false, message: '请填写你的饭局角色' };
    if (!trimmed(input.banquetGoal)) return { valid: false, message: '请填写本次饭局目标' };
    if (!trimmed(input.guestProfile)) return { valid: false, message: '请填写嘉宾背景' };
    if (!trimmed(input.contactName)) return { valid: false, message: '请填写联系人姓名' };
    if (!isMainlandPhone(input.contactPhone || '')) return { valid: false, message: '请填写有效的联系人手机号' };
    if (input.banquetGoal && input.banquetGoal.length > 160) return { valid: false, message: '饭局目标请控制在 160 字内' };
    if (input.guestProfile && input.guestProfile.length > 180) return { valid: false, message: '嘉宾背景请控制在 180 字内' };
    if (input.venuePreference && input.venuePreference.length > 160) return { valid: false, message: '餐厅/包间偏好请控制在 160 字内' };
    return validateRiskText(input);
  }

  if (step === 2) {
    if (!trimmed(input.preferredAssistantStyle)) return { valid: false, message: '请选择商务助理风格' };
    if (!trimmed(input.privacyLevel)) return { valid: false, message: '请选择隐私级别' };
    if (input.arrivalPlan && input.arrivalPlan.length > 160) return { valid: false, message: '到场与接待安排请控制在 160 字内' };
    if (input.preference && input.preference.length > 220) return { valid: false, message: '偏好描述请控制在 220 字内' };
    if (input.taboos && input.taboos.length > 220) return { valid: false, message: '禁忌说明请控制在 220 字内' };
    if (input.remark && input.remark.length > 300) return { valid: false, message: '备注请控制在 300 字内' };
    return validateRiskText(input);
  }

  return { valid: true };
}

function isFutureServiceTime(date: string, time: string): boolean {
  if (!date || !time) return false;
  const value = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(value) && value > Date.now();
}

function isMainlandPhone(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value.trim());
}

function trimmed(value?: string): string {
  return (value || '').trim();
}

function validateRiskText(input: BookingDraft): ValidationResult {
  const text = [
    input.banquetGoal,
    input.guestProfile,
    input.venuePreference,
    input.arrivalPlan,
    input.preference,
    input.taboos,
    input.remark
  ].filter(Boolean).join('\n');
  const hit = [
    '特殊服务',
    '私下联系',
    '加微信',
    '微信号',
    '线下转账',
    '绕过平台',
    '不走平台',
    '过夜',
    '陪酒',
    '亲密'
  ].find(word => text.includes(word));
  if (hit) {
    return { valid: false, message: `需求中包含不符合服务边界的内容：${hit}` };
  }
  return { valid: true };
}

export function assertBoundaryChecked(checked: boolean): ValidationResult {
  if (!checked) {
    return { valid: false, message: '请先确认服务边界协议' };
  }
  return { valid: true };
}

export function assertOrderConfirmations(checked: {
  boundary: boolean;
  privacy: boolean;
  platformContact: boolean;
}): ValidationResult {
  if (!checked.boundary) return { valid: false, message: '请确认服务边界协议' };
  if (!checked.privacy) return { valid: false, message: '请确认隐私与信息使用说明' };
  if (!checked.platformContact) return { valid: false, message: '请确认沟通与支付均通过平台完成' };
  return { valid: true };
}

export function assertAssistantBoundaryChecked(checked: boolean): ValidationResult {
  if (!checked) {
    return { valid: false, message: '商务助理需先确认服务边界协议' };
  }
  return { valid: true };
}
