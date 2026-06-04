import { api } from '../../services/api';
import { ServiceScene } from '../../services/types';

Page({
  data: {
    scenes: [] as ServiceScene[],
    loading: false,
    error: ''
  },

  async onLoad() {
    await this.loadScenes();
  },

  async loadScenes() {
    this.setData({ loading: true, error: '' });
    try {
      this.setData({ scenes: await api.getScenes() });
    } catch (error) {
      this.setData({ scenes: [], error: (error as Error).message || '场景加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  openScene(event: WechatMiniprogram.BaseEvent) {
    wx.navigateTo({ url: `/pages/scene-detail/index?id=${event.currentTarget.dataset.id}` });
  },

  chooseAssistants(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id;
    const name = event.currentTarget.dataset.name || '';
    wx.navigateTo({ url: `/pages/assistants/index?scene=${encodeURIComponent(name)}&sceneId=${encodeURIComponent(id || '')}` });
  },

  retry() {
    this.loadScenes();
  }
});
