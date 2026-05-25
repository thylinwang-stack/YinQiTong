Page({
  data: {
    activeTab: 'service'
  },

  onLoad(query: { tab?: string }) {
    if (query.tab === 'privacy') {
      this.setData({ activeTab: 'privacy' });
    }
  },

  switchTab(event: WechatMiniprogram.BaseEvent) {
    this.setData({ activeTab: event.currentTarget.dataset.tab });
  }
});
