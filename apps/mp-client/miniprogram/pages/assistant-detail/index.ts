import { api } from '../../services/api';
import { appStore } from '../../store/app-store';
import { AssistantPublicProfile } from '../../services/types';

Page({
  data: {
    assistant: undefined as AssistantPublicProfile | undefined,
    sceneName: '',
    sceneId: '',
    packageId: ''
  },

  async onLoad(query: { id?: string; scene?: string; sceneId?: string; packageId?: string }) {
    if (!query.id) return;
    this.setData({
      sceneName: query.scene ? decodeURIComponent(query.scene) : '',
      sceneId: query.sceneId || '',
      packageId: query.packageId || '',
      assistant: await api.getAssistant(query.id)
    });
  },

  goBooking() {
    const state = appStore.getState();
    const selectedPackage = state.selectedPackage;
    if (this.data.sceneId || this.data.sceneName || selectedPackage) {
      appStore.setPendingBooking({
        city: this.data.assistant?.city || '',
        date: '',
        time: '',
        dinnerType: this.data.sceneName,
        guestCount: 4,
        assistantCount: selectedPackage?.assistantCount || 1,
        budget: selectedPackage?.serviceFee || 1500,
        preference: this.data.assistant ? `意向商务助理：${this.data.assistant.workName}（${this.data.assistant.assistantNo}）` : '',
        taboos: '',
        remark: '',
        sceneId: this.data.sceneId,
        packageId: this.data.packageId || selectedPackage?.id
      });
    }
    const query = [
      this.data.sceneId ? `sceneId=${encodeURIComponent(this.data.sceneId)}` : '',
      this.data.packageId ? `packageId=${encodeURIComponent(this.data.packageId)}` : ''
    ].filter(Boolean).join('&');
    wx.navigateTo({ url: `/pages/booking-form/index${query ? `?${query}` : ''}` });
  }
});
