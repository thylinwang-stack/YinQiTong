import { api } from '../../services/api';
import { StaffWorkItem } from '../../services/types';
import { guardStaffAccess } from '../../utils/access';

const statusText: Record<string, string> = {
  approved: '待确认',
  assistant_confirmed: '已确认',
  reminder_sent: '已提醒',
  reviewed: '已复盘'
};

const checkInText: Record<string, string> = {
  not_started: '未签到',
  checked_in: '已签到',
  checked_out: '已签退'
};

Page({
  data: {
    loading: false,
    workItems: [] as Array<StaffWorkItem & { statusText: string; checkInText: string }>,
    todayCount: 0,
    pendingConfirmCount: 0,
    pendingTaskCount: 0,
    pendingSettlementCount: 0
  },

  async onLoad() {
    if (!guardStaffAccess()) return;
    await this.load();
  },

  async onShow() {
    if (!guardStaffAccess()) return;
    await this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const workItems = (await api.listStaffWorkItems()).map(item => ({
        ...item,
        statusText: statusText[item.status] || item.status,
        checkInText: checkInText[item.checkInStatus] || item.checkInStatus
      }));
      this.setData({
        workItems,
        todayCount: workItems.length,
        pendingConfirmCount: workItems.filter(item => !item.boundaryConfirmed).length,
        pendingTaskCount: workItems.reduce((sum, item) => sum + Math.max(0, item.taskTotal - item.taskDone), 0),
        pendingSettlementCount: workItems.filter(item => item.settlementStatus !== 'settled').length
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  openBrief(event: WechatMiniprogram.BaseEvent) {
    wx.navigateTo({ url: `/pages/staff-brief/index?id=${event.currentTarget.dataset.id}` });
  },

  openTasks(event: WechatMiniprogram.BaseEvent) {
    wx.navigateTo({ url: `/pages/staff-task-list/index?id=${event.currentTarget.dataset.id}` });
  },

  async checkIn(event: WechatMiniprogram.BaseEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    const action = event.currentTarget.dataset.action as 'check_in' | 'check_out';
    if (!id || !action) return;
    await api.checkInStaffWorkItem(id, action);
    wx.showToast({ title: action === 'check_in' ? '已签到' : '已签退', icon: 'success' });
    await this.load();
  }
});
