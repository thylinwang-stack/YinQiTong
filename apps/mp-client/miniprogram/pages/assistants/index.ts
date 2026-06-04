import { api } from '../../services/api';
import { AssistantFilters, AssistantPublicProfile } from '../../services/types';

Page({
  data: {
    assistants: [] as AssistantPublicProfile[],
    filters: {} as AssistantFilters,
    sceneId: '',
    packageId: '',
    sceneName: '',
    loading: false,
    error: '',
    cityOptions: ['不限', '上海', '北京', '深圳'],
    sceneOptions: ['不限', '商务宴请', '私人茶会', '高端酒会', '高尔夫商务同场', '城市临时管家', '闭门沙龙', '艺术展览', '运动社交', '品牌私享会'],
    styleOptions: ['不限', '沉稳', '知性', '商务感', '大方', '亲和', '控场', '干练', '国际化', '礼宾', '茶艺', '侍酒', '球局礼仪']
  },

  async onLoad(query: { scene?: string; sceneId?: string; packageId?: string }) {
    const sceneName = query.scene ? decodeURIComponent(query.scene) : '';
    this.setData({
      sceneName,
      sceneId: query.sceneId || '',
      packageId: query.packageId || '',
      filters: sceneName ? { ...this.data.filters, scene: sceneName } : this.data.filters
    });
    wx.setNavigationBarTitle({ title: sceneName ? `${sceneName}助理` : '选择助理' });
    await this.loadAssistants();
  },

  async loadAssistants() {
    this.setData({ loading: true, error: '' });
    try {
      this.setData({ assistants: await api.getAssistants(this.data.filters) });
    } catch (error) {
      this.setData({ assistants: [], error: (error as Error).message || '助理资料加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onCityChange(event: any) {
    const value = this.data.cityOptions[Number(event.detail.value)];
    this.setData({ filters: { ...this.data.filters, city: value === '不限' ? '' : value } });
    await this.loadAssistants();
  },

  async onSceneChange(event: any) {
    const value = this.data.sceneOptions[Number(event.detail.value)];
    this.setData({ filters: { ...this.data.filters, scene: value === '不限' ? '' : value } });
    await this.loadAssistants();
  },

  async onStyleChange(event: any) {
    const value = this.data.styleOptions[Number(event.detail.value)];
    this.setData({ filters: { ...this.data.filters, styleTag: value === '不限' ? '' : value } });
    await this.loadAssistants();
  },

  async resetFilters() {
    this.setData({ filters: {} });
    await this.loadAssistants();
  },

  openDetail(event: WechatMiniprogram.BaseEvent) {
    const query = [
      `id=${encodeURIComponent(event.currentTarget.dataset.id || '')}`,
      this.data.sceneName ? `scene=${encodeURIComponent(this.data.sceneName)}` : '',
      this.data.sceneId ? `sceneId=${encodeURIComponent(this.data.sceneId)}` : '',
      this.data.packageId ? `packageId=${encodeURIComponent(this.data.packageId)}` : ''
    ].filter(Boolean).join('&');
    wx.navigateTo({ url: `/pages/assistant-detail/index?${query}` });
  },

  retry() {
    this.loadAssistants();
  }
});
