import { api } from '../../services/api';
import { AssistantPublicProfile } from '../../services/types';

Page({
  data: {
    assistant: undefined as AssistantPublicProfile | undefined
  },

  async onLoad(query: { id?: string }) {
    if (!query.id) return;
    this.setData({ assistant: await api.getAssistant(query.id) });
  },

  goBooking() {
    wx.navigateTo({ url: '/pages/booking-form/index' });
  }
});
