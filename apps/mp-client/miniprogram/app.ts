App<IAppOption>({
  globalData: {
    apiMode: 'mock',
    apiBaseUrl: 'http://127.0.0.1:3000'
  },
  onLaunch() {
    if (!wx.getStorageSync('apiMode')) {
      wx.setStorageSync('apiMode', this.globalData.apiMode);
    }
    if (!wx.getStorageSync('apiBaseUrl')) {
      wx.setStorageSync('apiBaseUrl', this.globalData.apiBaseUrl);
    }
  }
});

interface IAppOption {
  globalData: {
    apiMode: 'mock' | 'real';
    apiBaseUrl: string;
  };
}
