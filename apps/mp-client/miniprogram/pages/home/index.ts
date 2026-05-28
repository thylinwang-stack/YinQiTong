import { api } from '../../services/api';
import { AssistantPublicProfile, ServiceScene } from '../../services/types';

Page({
  data: {
    scenes: [] as ServiceScene[],
    assistants: [] as AssistantPublicProfile[],
    loading: false,
    error: ''
  },

  async onLoad() {
    await this.loadHomeData();
  },

  async loadHomeData() {
    this.setData({ loading: true, error: '' });
    try {
      const [scenes, assistants] = await Promise.all([
        api.getScenes(),
        api.getAssistants({})
      ]);
      this.setData({
        scenes: scenes.slice(0, 4),
        assistants: assistants.slice(0, 2)
      });
    } catch (error) {
      this.setData({ error: (error as Error).message || '首页数据加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBooking() {
    wx.navigateTo({ url: '/pages/booking-form/index' });
  },

  goAssistants() {
    wx.navigateTo({ url: '/pages/assistants/index' });
  },

  goScenes() {
    wx.switchTab({ url: '/pages/scenes/index' });
  },

  openScene(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/packages/index?sceneId=${id}` });
  },

  openAssistant(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/assistant-detail/index?id=${id}` });
  },

  retry() {
    this.loadHomeData();
  }
});
