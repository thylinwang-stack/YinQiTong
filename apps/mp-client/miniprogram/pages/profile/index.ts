import { api } from '../../services/api';

Page({
  data: {
    isLoggedIn: false,
    userName: '商务客户'
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    this.setData({ isLoggedIn: Boolean(token) });
  },

  async login() {
    wx.showLoading({ title: '登录中' });
    try {
      const result = await api.loginWithWechat();
      this.setData({ isLoggedIn: true, userName: result.user.name || '商务客户' });
      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch {
      wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goOrders() {
    wx.switchTab({ url: '/pages/orders/index' });
  },

  goBooking() {
    wx.navigateTo({ url: '/pages/booking-form/index' });
  },

  goStaffBrief() {
    wx.navigateTo({ url: '/pages/staff-brief/index?id=brief_001' });
  },

  goPolicy(event: WechatMiniprogram.BaseEvent) {
    wx.navigateTo({ url: `/pages/policy/index?tab=${event.currentTarget.dataset.tab}` });
  }
});
