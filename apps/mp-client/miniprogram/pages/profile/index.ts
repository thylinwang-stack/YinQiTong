Page({
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
