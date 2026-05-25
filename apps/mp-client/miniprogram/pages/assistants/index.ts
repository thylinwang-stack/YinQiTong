import { api } from '../../services/api';
import { AssistantFilters, AssistantPublicProfile } from '../../services/types';

Page({
  data: {
    assistants: [] as AssistantPublicProfile[],
    filters: {} as AssistantFilters,
    cityOptions: ['不限', '上海', '北京', '深圳'],
    sceneOptions: ['不限', '商务宴请', '客户接待', '项目沟通', '朋友小聚', '城市到访'],
    styleOptions: ['不限', '沉稳', '知性', '商务感', '大方', '亲和', '控场', '干练', '国际化', '礼宾']
  },

  async onLoad() {
    await this.loadAssistants();
  },

  async loadAssistants() {
    this.setData({ assistants: await api.getAssistants(this.data.filters) });
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
    wx.navigateTo({ url: `/pages/assistant-detail/index?id=${event.currentTarget.dataset.id}` });
  }
});
