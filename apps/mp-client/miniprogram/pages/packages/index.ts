import { api } from '../../services/api';
import { ServicePackage } from '../../services/types';
import { appStore } from '../../store/app-store';

Page({
  data: {
    packages: [] as ServicePackage[]
  },

  async onLoad(query: { sceneId?: string }) {
    this.setData({ packages: await api.getPackages(query.sceneId) });
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
    wx.navigateTo({ url: `/pages/booking-form/index?sceneId=${selected.sceneId}&packageId=${selected.id}` });
  }
});
