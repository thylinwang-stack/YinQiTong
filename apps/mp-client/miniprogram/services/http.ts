import { ApiMode } from './types';

const BASE_URL = 'https://api.example.com';

export const getApiMode = (): ApiMode => {
  return (wx.getStorageSync('apiMode') as ApiMode) || 'mock';
};

export function request<T>(options: WechatMiniprogram.RequestOption): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url: `${BASE_URL}${options.url}`,
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
        reject(new Error(`请求失败：${status}`));
      },
      fail: reject
    });
  });
}
