import { appStore } from '../../store/app-store';
import { BookingDraft } from '../../services/types';
import { validateBookingDraft, validateBookingStep } from '../../utils/validators';

const emptyForm: BookingDraft = {
  city: '',
  date: '',
  time: '',
  dinnerType: '',
  guestCount: 4,
  assistantCount: 1,
  budget: 1500,
  hostRole: '',
  banquetGoal: '',
  guestProfile: '',
  district: '',
  venueType: '',
  meetingPoint: '',
  arrivalWindow: '',
  transportNote: '',
  venuePreference: '',
  contactName: '',
  contactPhone: '',
  preferredAssistantStyle: '',
  privacyLevel: '',
  dressCode: '',
  languageRequirement: '',
  arrivalPlan: '',
  callbackWindow: '',
  preference: '',
  taboos: '',
  remark: ''
};

Page({
  data: {
    form: { ...emptyForm },
    currentStep: 0,
    minDate: todayString(),
    steps: [
      { label: '时间地点' },
      { label: '关系目标' },
      { label: '边界偏好' }
    ],
    cityOptions: ['上海', '北京', '深圳', '杭州', '广州', '成都'],
    venueTypeOptions: ['商务餐厅 / 私宴包间', '私享茶室 / 会所茶空间', '会员制酒会空间', '高尔夫俱乐部 / 会所轻餐区', '酒店大堂 / 商务车动线', '闭门沙龙空间', '画廊 / 美术馆预览', '运动俱乐部 / 轻餐区'],
    dinnerTypes: ['商务宴请', '客户接待', '项目沟通', '私人茶会', '高端酒会', '高尔夫商务同场', '城市临时管家', '轻商务接待'],
    styleOptions: ['沉稳得体', '亲和控场', '干练礼宾', '国际化双语', '轻松破冰', '茶艺礼宾', '侍酒协同', '球局礼仪'],
    privacyOptions: ['普通商务信息', '敏感客户信息', '高度保密，仅客服和主管可见'],
    dressCodeOptions: ['商务正装', '商务休闲', '深色低调', '茶会雅致', '酒会正式', '高尔夫得体', '按场地/活动要求确认'],
    languageOptions: ['中文', '中文 + 英文寒暄', '中文 + 英文流利沟通', '按客户情况确认'],
    callbackOptions: ['随时可联系', '工作日白天', '工作日晚间', '请先短信/微信小程序内留言']
  },

  onLoad(query: { sceneId?: string; packageId?: string }) {
    const draft = appStore.getState().pendingBooking || emptyForm;
    this.setData({
      form: {
        ...emptyForm,
        ...draft,
        sceneId: query.sceneId || draft.sceneId,
        packageId: query.packageId || draft.packageId
      }
    });
  },

  onDateChange(event: any) {
    this.setData({ 'form.date': event.detail.value });
    this.saveDraft();
  },

  onTimeChange(event: any) {
    this.setData({ 'form.time': event.detail.value });
    this.saveDraft();
  },

  onOptionChange(event: any) {
    const field = event.currentTarget.dataset.field;
    const optionsKey = event.currentTarget.dataset.options;
    const options = this.data[optionsKey] || [];
    this.setData({ [`form.${field}`]: options[Number(event.detail.value)] });
    this.saveDraft();
  },

  onTextInput(event: any) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value });
    this.saveDraft();
  },

  onNumberInput(event: any) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: Number(event.detail.value) });
    this.saveDraft();
  },

  nextStep() {
    const result = validateBookingStep(this.data.form, this.data.currentStep);
    if (!result.valid) {
      wx.showToast({ title: result.message || '请检查当前步骤', icon: 'none' });
      return;
    }
    this.setData({ currentStep: Math.min(2, this.data.currentStep + 1) });
    this.saveDraft();
  },

  prevStep() {
    this.setData({ currentStep: Math.max(0, this.data.currentStep - 1) });
  },

  submit() {
    const result = validateBookingDraft(this.data.form);
    if (!result.valid) {
      wx.showToast({ title: result.message || '请检查表单', icon: 'none' });
      return;
    }
    this.saveDraft();
    wx.navigateTo({ url: '/pages/order-confirm/index' });
  },

  saveDraft() {
    appStore.setPendingBooking(this.data.form);
  }
});

function todayString(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
