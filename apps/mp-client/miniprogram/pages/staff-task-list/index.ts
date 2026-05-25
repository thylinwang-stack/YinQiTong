import { api } from '../../services/api';
import { StaffMealBrief } from '../../services/types';

Page({
  data: {
    briefId: '',
    brief: undefined as StaffMealBrief | undefined,
    completedCount: 0
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
      completedCount: brief?.tasks.filter(item => item.status === 'done').length || 0
    });
  },

  async toggleTask(event: any) {
    const brief = this.data.brief;
    const taskId = event.currentTarget.dataset.id;
    if (!brief || !taskId) return;
    const task = brief.tasks.find(item => item.id === taskId);
    const next = task?.status !== 'done';
    const updated = await api.updateStaffTask(brief.id, taskId, next);
    this.setData({
      brief: updated,
      completedCount: updated?.tasks.filter(item => item.status === 'done').length || 0
    });
  },

  goBrief() {
    const id = this.data.brief?.id || this.data.briefId;
    wx.navigateTo({ url: `/pages/staff-brief/index?id=${id}` });
  }
});
