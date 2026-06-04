import { api } from '../../services/api';
import { ServicePackage } from '../../services/types';
import { appStore } from '../../store/app-store';

Page({
  data: {
    packages: [] as ServicePackage[],
    sceneId: '',
    sceneName: '',
    loading: false,
    error: ''
  },

  async onLoad(query: { sceneId?: string; scene?: string }) {
    this.setData({ sceneId: query.sceneId || '', sceneName: query.scene ? decodeURIComponent(query.scene) : '' });
    await this.loadPackages();
  },

  async loadPackages() {
    this.setData({ loading: true, error: '' });
    try {
      this.setData({ packages: await api.getPackages(this.data.sceneId) });
    } catch (error) {
      this.setData({ packages: [], error: (error as Error).message || '套餐加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  choosePackage(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id;
    const selected = this.data.packages.find(item => item.id === id);
    if (!selected) return;
    appStore.setSelectedPackage(selected);
    appStore.setPendingBooking({
      city: '',
      date: '',
      time: '',
      dinnerType: '',
      guestCount: 4,
      assistantCount: selected.assistantCount,
      budget: selected.serviceFee,
      preference: '',
      taboos: '',
      remark: '',
      sceneId: selected.sceneId,
      packageId: selected.id
    });
    wx.navigateTo({
      url: `/pages/assistants/index?scene=${encodeURIComponent(this.data.sceneName)}&sceneId=${encodeURIComponent(selected.sceneId)}&packageId=${encodeURIComponent(selected.id)}`
    });
  },

  retry() {
    this.loadPackages();
  }
});
