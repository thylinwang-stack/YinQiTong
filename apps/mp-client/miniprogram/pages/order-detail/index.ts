import { api, requestPayment } from '../../services/api';
import { appStore } from '../../store/app-store';
import { BookingOrder } from '../../services/types';
import { bookingStatusText } from '../../utils/format';

const steps = [
  { key: 'pending_payment', name: '支付预约金', desc: '确认服务边界后支付预约金' },
  { key: 'pending_match', name: '平台匹配', desc: '运营根据城市、档期和场景匹配助理' },
  { key: 'brief_preparing', name: '餐前准备', desc: '客服整理接待目标、话题建议和禁止事项' },
  { key: 'ready_for_service', name: '待服务', desc: '助理确认任务并阅读餐前 brief' },
  { key: 'in_service', name: '服务中', desc: '现场协同与礼宾接待执行中' },
  { key: 'completed', name: '已完成', desc: '服务完成，可进行评价' }
];

Page({
  data: {
    order: undefined as BookingOrder | undefined,
    statusText: '',
    steps,
    activeStep: 0
  },

  async onLoad(query: { id?: string }) {
    if (!query.id) return;
    const order = await api.getOrder(query.id);
    this.setOrder(order);
  },

  setOrder(order?: BookingOrder) {
    if (!order) {
      this.setData({ order: undefined });
      return;
    }
    const currentIndex = steps.findIndex(item => item.key === order.status);
    this.setData({
      order,
      statusText: bookingStatusText[order.status],
      activeStep: currentIndex >= 0 ? currentIndex : 0
    });
  },

  contactService() {
    wx.showModal({
      title: '平台客服',
      content: 'MVP 阶段展示客服入口，后续接入受控消息系统。',
      showCancel: false
    });
  },

  async payAgain() {
    if (!this.data.order) return;
    try {
      const payment = await api.createPayment(this.data.order.id);
      await requestPayment(payment);
      const order = await api.markOrderPaid(this.data.order.id);
      this.setOrder(order);
      if (order) appStore.setLatestOrder(order);
      appStore.setPaymentResult({
        orderNo: this.data.order.orderNo,
        status: 'success',
        message: '预约金支付成功，平台将继续推进需求审核与匹配。'
      });
      wx.navigateTo({ url: '/pages/payment-result/index' });
    } catch (error) {
      const errMsg = String((error as any)?.errMsg || '');
      appStore.setPaymentResult({
        orderNo: this.data.order.orderNo,
        status: errMsg.includes('cancel') ? 'cancelled' : 'failed',
        message: errMsg.includes('cancel') ? '你已取消支付。' : '支付未完成，请稍后重试。'
      });
      wx.navigateTo({ url: '/pages/payment-result/index' });
    }
  }
});
