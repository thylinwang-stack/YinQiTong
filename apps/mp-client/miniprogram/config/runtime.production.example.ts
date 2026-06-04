import { RuntimeConfig } from './runtime';

export const productionRuntimeConfig: RuntimeConfig = {
  environment: 'production',
  configVersion: '2026-05-31-prod',
  apiMode: 'real',
  apiBaseUrl: 'https://api.juclub.com.cn',
  wecomCustomerServiceCorpId: '替换为企业微信 CorpID',
  wecomCustomerServiceUrl: '替换为企业微信客服链接'
};
