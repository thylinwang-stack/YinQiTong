import { api } from '../../services/api';
import { appStore } from '../../store/app-store';
import { ServiceScene } from '../../services/types';

Page({
  data: {
    scenes: [] as ServiceScene[]
  },

  async onLoad() {
    this.setData({ scenes: await api.getScenes() });
  },

  openPackages(event: WechatMiniprogram.BaseEvent) {
    wx.navigateTo({ url: `/pages/packages/index?sceneId=${event.currentTarget.dataset.id}` });
  },

  createBooking(event: WechatMiniprogram.BaseEvent) {
    const sceneId = event.currentTarget.dataset.id as string;
    appStore.setPendingBooking({
      city: '',
      date: '',
      time: '',
      dinnerType: '',
      guestCount: 4,
      assistantCount: 1,
      budget: 1500,
      preference: '',
      taboos: '',
      remark: '',
      sceneId
    });
    wx.navigateTo({ url: `/pages/booking-form/index?sceneId=${sceneId}` });
  }
});
