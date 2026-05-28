import { ApiMode } from './types';

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const REQUEST_TIMEOUT = 15000;
type RequestMethod = NonNullable<WechatMiniprogram.RequestOption['method']> | 'PATCH';
type AppRequestOption = Omit<WechatMiniprogram.RequestOption, 'method'> & { method?: RequestMethod };

export const getApiMode = (): ApiMode => {
  return (wx.getStorageSync('apiMode') as ApiMode) || 'mock';
};

export const getApiBaseUrl = (): string => {
  return wx.getStorageSync('apiBaseUrl') || DEFAULT_BASE_URL;
};

export function request<T>(options: AppRequestOption): Promise<T> {
  return new Promise((resolve, reject) => {
    const { method, ...rest } = options;
    wx.request({
      ...rest,
      url: `${getApiBaseUrl()}${options.url}`,
      method: method as WechatMiniprogram.RequestOption['method'],
      timeout: options.timeout || REQUEST_TIMEOUT,
      header: {
        'content-type': 'application/json',
        Authorization: wx.getStorageSync('token') ? `Bearer ${wx.getStorageSync('token')}` : '',
        ...(options.header || {})
      },
      success(res) {
        const status = res.statusCode || 0;
        if (status >= 200 && status < 300) {
          resolve(res.data as T);
          return;
        }
        if (status === 401) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('user');
        }
        const payload = res.data as { message?: string; code?: string } | undefined;
        reject(new Error(payload?.message || payload?.code || friendlyStatusMessage(status)));
      },
      fail(error) {
        reject(new Error(normalizeNetworkError(error)));
      }
    });
  });
}

function friendlyStatusMessage(status: number): string {
  if (status === 401) return '登录状态已失效，请重新登录';
  if (status === 403) return '当前账号没有权限执行该操作';
  if (status === 404) return '请求的服务不存在';
  if (status >= 500) return '服务暂时不可用，请稍后再试';
  return `请求失败：${status}`;
}

function normalizeNetworkError(error: WechatMiniprogram.GeneralCallbackResult): string {
  const message = String(error?.errMsg || '');
  if (message.includes('timeout')) return '网络请求超时，请检查连接后重试';
  if (message.includes('fail')) return '网络连接失败，请稍后重试';
  return message || '网络请求失败';
}
