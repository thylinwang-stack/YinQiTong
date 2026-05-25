import { api } from '../../services/api';
import { StaffMealBrief } from '../../services/types';
import { assertAssistantBoundaryChecked } from '../../utils/validators';

const statusText: Record<string, string> = {
  approved: '待确认',
  assistant_confirmed: '已确认',
  reminder_sent: '已提醒',
  reviewed: '已复盘'
};

Page({
  data: {
    briefId: '',
    brief: undefined as StaffMealBrief | undefined,
    statusText: '',
    feedback: '',
    protocolChecked: false
  },

  async onLoad(query: { id?: string }) {
    const briefId = query.id || 'brief_001';
    this.setData({ briefId });
    await this.loadBrief(briefId);
  },

  async loadBrief(id: string) {
    const brief = await api.getStaffMealBrief(id);
    this.setData({
      brief,
      statusText: brief ? statusText[brief.status] || brief.status : ''
    });
  },

  async confirmBrief() {
    const id = this.data.brief?.id || this.data.briefId;
    if (!id) return;
    const protocol = assertAssistantBoundaryChecked(this.data.protocolChecked);
    if (!protocol.valid) {
      wx.showToast({ title: protocol.message || '请确认协议', icon: 'none' });
      return;
    }
    if (this.data.brief?.orderNo) {
      await api.confirmServiceBoundary({
        orderId: this.data.brief.orderId || this.data.brief.orderNo,
        actorType: 'assistant',
        protocolVersion: 'service_boundary_v1'
      });
    }
    const brief = await api.confirmStaffMealBrief(id);
    this.setData({
      brief,
      statusText: brief ? statusText[brief.status] || brief.status : ''
    });
    wx.showToast({ title: '已确认 brief', icon: 'success' });
  },

  openTasks() {
    const id = this.data.brief?.id || this.data.briefId;
    wx.navigateTo({ url: `/pages/staff-task-list/index?id=${id}` });
  },

  onFeedbackInput(event: any) {
    this.setData({ feedback: event.detail.value });
  },

  onProtocolChange(event: any) {
    const values = event.detail.value || [];
    this.setData({ protocolChecked: values.includes('protocol') });
  },

  async submitFeedback() {
    const id = this.data.brief?.id || this.data.briefId;
    if (!id || !this.data.feedback.trim()) {
      wx.showToast({ title: '请填写反馈', icon: 'none' });
      return;
    }
    await api.submitStaffReview(id, { assistantFeedback: this.data.feedback.trim() });
    wx.showToast({ title: '反馈已提交', icon: 'success' });
    this.setData({ feedback: '' });
  }
});
