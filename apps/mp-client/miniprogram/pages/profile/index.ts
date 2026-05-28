import { api } from '../../services/api';
import { hasStaffAccess } from '../../utils/access';

Page({
  data: {
    isLoggedIn: false,
    userName: '商务客户',
    isStaff: false
  },

  onLoad() {
    this.refreshProfile();
  },

  onShow() {
    this.refreshProfile();
  },

  refreshProfile() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user') as { name?: string } | undefined;
    this.setData({
      isLoggedIn: Boolean(token),
      userName: user?.name || this.data.userName || '商务客户',
      isStaff: hasStaffAccess()
    });
  },

  async login() {
    wx.showLoading({ title: '登录中' });
    try {
      const result = await api.loginWithWechat();
      this.setData({
        isLoggedIn: true,
        userName: result.user.name || '商务客户',
        isStaff: hasStaffAccess()
      });
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
    if (!hasStaffAccess()) {
      wx.showToast({ title: '员工端需内部账号访问', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/staff-brief/index?id=brief_001' });
  },

  goPolicy(event: WechatMiniprogram.BaseEvent) {
    wx.navigateTo({ url: `/pages/policy/index?tab=${event.currentTarget.dataset.tab}` });
  }
});
