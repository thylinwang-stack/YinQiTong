import { runtimeConfig, validateRuntimeConfig } from './config/runtime';

App<IAppOption>({
  globalData: {
    configVersion: runtimeConfig.configVersion,
    environment: runtimeConfig.environment,
    apiMode: runtimeConfig.apiMode,
    apiBaseUrl: runtimeConfig.apiBaseUrl,
    wecomCustomerServiceCorpId: runtimeConfig.wecomCustomerServiceCorpId,
    wecomCustomerServiceUrl: runtimeConfig.wecomCustomerServiceUrl
  },
  onLaunch() {
    const previousConfigVersion = wx.getStorageSync('configVersion');
    if (previousConfigVersion !== this.globalData.configVersion) {
      wx.setStorageSync('configVersion', this.globalData.configVersion);
      wx.setStorageSync('apiMode', this.globalData.apiMode);
      wx.setStorageSync('apiBaseUrl', this.globalData.apiBaseUrl);
      wx.setStorageSync('wecomCustomerServiceCorpId', this.globalData.wecomCustomerServiceCorpId);
      wx.setStorageSync('wecomCustomerServiceUrl', this.globalData.wecomCustomerServiceUrl);
    }
    const issues = validateRuntimeConfig(this.globalData);
    if (issues.length > 0) {
      console.warn('[runtime-config]', issues.join('；'));
    }
  }
});

interface IAppOption {
  globalData: {
    configVersion: string;
    environment: 'development' | 'production';
    apiMode: 'mock' | 'real';
    apiBaseUrl: string;
    wecomCustomerServiceCorpId: string;
    wecomCustomerServiceUrl: string;
  };
}
