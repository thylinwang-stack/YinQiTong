import { appStore } from '../../store/app-store';
import { PaymentResultState } from '../../services/types';

const fallback: PaymentResultState = {
  orderNo: '',
  status: 'failed',
  message: '未获取到支付结果，请前往订单列表查看最新状态。'
};

Page({
  data: {
    result: fallback,
    title: '支付未完成',
    icon: '!'
  },

  onLoad() {
    const result = appStore.getState().paymentResult || fallback;
    const map = {
      success: { title: '支付成功', icon: '✓' },
      failed: { title: '支付失败', icon: '!' },
      cancelled: { title: '支付已取消', icon: '×' }
    };
    this.setData({
      result,
      title: map[result.status].title,
      icon: map[result.status].icon
    });
  },

  goOrders() {
    wx.switchTab({ url: '/pages/orders/index' });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  }
});
