import { appStore } from '../../store/app-store';
import { BookingDraft } from '../../services/types';
import { validateBookingDraft } from '../../utils/validators';

const emptyForm: BookingDraft = {
  city: '',
  date: '',
  time: '',
  dinnerType: '',
  guestCount: 4,
  assistantCount: 1,
  budget: 1500,
  preference: '',
  taboos: '',
  remark: ''
};

Page({
  data: {
    form: { ...emptyForm },
    cityOptions: ['上海', '北京', '深圳', '杭州', '广州', '成都'],
    dinnerTypes: ['商务宴请', '客户接待', '项目沟通', '朋友小聚', '城市到访']
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

  onCityChange(event: any) {
    this.setData({ 'form.city': this.data.cityOptions[Number(event.detail.value)] });
  },

  onDateChange(event: any) {
    this.setData({ 'form.date': event.detail.value });
  },

  onTimeChange(event: any) {
    this.setData({ 'form.time': event.detail.value });
  },

  onDinnerTypeChange(event: any) {
    this.setData({ 'form.dinnerType': this.data.dinnerTypes[Number(event.detail.value)] });
  },

  onTextInput(event: any) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value });
  },

  onNumberInput(event: any) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: Number(event.detail.value) });
  },

  submit() {
    const result = validateBookingDraft(this.data.form);
    if (!result.valid) {
      wx.showToast({ title: result.message || '请检查表单', icon: 'none' });
      return;
    }
    appStore.setPendingBooking(this.data.form);
    wx.navigateTo({ url: '/pages/order-confirm/index' });
  }
});
