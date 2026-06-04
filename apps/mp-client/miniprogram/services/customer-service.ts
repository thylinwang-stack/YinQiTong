import { api } from './api';
import { BookingOrder, SupportRequestType } from './types';

type WeComCustomerServiceConfig = {
  corpId?: string;
  url?: string;
};

type CustomerServiceContext = {
  order?: BookingOrder;
  type: SupportRequestType;
  content: string;
};

type WeComOpenResult = {
  opened: boolean;
  recorded: boolean;
};

const serviceTypeText: Record<SupportRequestType, string> = {
  contact_service: '联系客服',
  reschedule: '申请改期',
  cancel: '取消订单',
  refund: '申请退款',
  invoice: '申请发票',
  add_requirement: '补充需求'
};

export async function openPlatformCustomerService(context: CustomerServiceContext): Promise<WeComOpenResult> {
  const recorded = await recordSupportRequest(context);
  const config = getWeComCustomerServiceConfig();

  if (!config.corpId || !config.url || !(wx as any).openCustomerServiceChat) {
    wx.showModal({
      title: '企业微信客服待配置',
      content: `${recorded ? '你的需求已记录。' : '当前客服请求未能写入。'}正式上线后将通过企业微信客服承接沟通，当前请等待平台客服回访。`,
      showCancel: false
    });
    return { opened: false, recorded };
  }

  return new Promise(resolve => {
    (wx as any).openCustomerServiceChat({
      corpId: config.corpId,
      extInfo: { url: buildWeComUrl(config.url || '', context) },
      success: () => resolve({ opened: true, recorded }),
      fail: () => {
        wx.showModal({
          title: '客服入口未打开',
          content: `${recorded ? '需求已留痕。' : '客服请求未能写入。'}如企业微信未拉起，请稍后重试或等待平台客服回访。`,
          showCancel: false
        });
        resolve({ opened: false, recorded });
      }
    });
  });
}

async function recordSupportRequest(context: CustomerServiceContext): Promise<boolean> {
  if (!context.order) return false;
  try {
    await api.requestOrderSupport(context.order.id, context.type, context.content);
    return true;
  } catch {
    return false;
  }
}

function getWeComCustomerServiceConfig(): WeComCustomerServiceConfig {
  const app = getApp<{
    globalData?: {
      wecomCustomerServiceCorpId?: string;
      wecomCustomerServiceUrl?: string;
    };
  }>();
  return {
    corpId: wx.getStorageSync('wecomCustomerServiceCorpId') || app.globalData?.wecomCustomerServiceCorpId,
    url: wx.getStorageSync('wecomCustomerServiceUrl') || app.globalData?.wecomCustomerServiceUrl
  };
}

function buildWeComUrl(baseUrl: string, context: CustomerServiceContext): string {
  const query = [
    ['scene', serviceTypeText[context.type]],
    ['orderNo', context.order?.orderNo || ''],
    ['orderId', context.order?.id || '']
  ]
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return query ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${query}` : baseUrl;
}
