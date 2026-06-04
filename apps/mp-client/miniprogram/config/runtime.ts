import { ApiMode } from '../services/types';

export interface RuntimeConfig {
  environment: 'development' | 'production';
  configVersion: string;
  apiMode: ApiMode;
  apiBaseUrl: string;
  wecomCustomerServiceCorpId: string;
  wecomCustomerServiceUrl: string;
}

export const runtimeConfig: RuntimeConfig = {
  environment: 'development',
  configVersion: '2026-05-31-dev',
  apiMode: 'mock',
  apiBaseUrl: 'http://127.0.0.1:3000',
  wecomCustomerServiceCorpId: '',
  wecomCustomerServiceUrl: ''
};

export function validateRuntimeConfig(config: RuntimeConfig): string[] {
  const issues: string[] = [];
  if (config.environment === 'production') {
    if (config.apiMode !== 'real') issues.push('生产环境必须使用真实 API');
    if (!config.apiBaseUrl.startsWith('https://')) issues.push('生产 API 必须使用 HTTPS 域名');
    if (config.apiBaseUrl.includes('127.0.0.1') || config.apiBaseUrl.includes('localhost')) {
      issues.push('生产 API 不能指向本机地址');
    }
    if (!config.wecomCustomerServiceCorpId || !config.wecomCustomerServiceUrl) {
      issues.push('生产环境必须配置企业微信客服入口');
    }
  }
  return issues;
}
