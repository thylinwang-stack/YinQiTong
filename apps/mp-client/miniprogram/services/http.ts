import { ApiMode } from './types';

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';

export const getApiMode = (): ApiMode => {
  return (wx.getStorageSync('apiMode') as ApiMode) || 'mock';
};

export const getApiBaseUrl = (): string => {
  return wx.getStorageSync('apiBaseUrl') || DEFAULT_BASE_URL;
};

export function request<T>(options: WechatMiniprogram.RequestOption): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url: `${getApiBaseUrl()}${options.url}`,
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
        const payload = res.data as { message?: string; code?: string } | undefined;
        reject(new Error(payload?.message || payload?.code || `请求失败：${status}`));
      },
      fail: reject
    });
  });
}
