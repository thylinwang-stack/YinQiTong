App<IAppOption>({
  globalData: {
    apiMode: 'mock'
  },
  onLaunch() {
    wx.setStorageSync('apiMode', this.globalData.apiMode);
  }
});

interface IAppOption {
  globalData: {
    apiMode: 'mock' | 'real';
  };
}
