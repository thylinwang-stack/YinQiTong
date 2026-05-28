import { api, ensureCustomerLogin, requestPayment } from '../../services/api';
import { appStore } from '../../store/app-store';
import { BookingOrder, SupportRequestType } from '../../services/types';
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
    activeStep: 0,
    serviceActions: [
      { label: '联系客服', type: 'contact_service' },
      { label: '申请改期', type: 'reschedule' },
      { label: '补充需求', type: 'add_requirement' },
      { label: '申请发票', type: 'invoice' },
      { label: '申请退款', type: 'refund' }
    ]
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
    this.createSupportRequest('contact_service', '客户从订单详情发起客服咨询');
  },

  onServiceAction(event: WechatMiniprogram.BaseEvent) {
    const type = event.currentTarget.dataset.type as SupportRequestType;
    if (!type) return;
    const actionMap: Record<SupportRequestType, { title: string; placeholder: string }> = {
      contact_service: { title: '联系平台客服', placeholder: '请简要说明希望客服协助的事项' },
      reschedule: { title: '申请改期', placeholder: '请填写希望调整到的日期、时间和原因' },
      cancel: { title: '取消订单', placeholder: '请填写取消原因' },
      refund: { title: '申请退款', placeholder: '请说明退款原因，客服会按规则核对' },
      invoice: { title: '申请发票', placeholder: '请填写发票抬头、税号和接收方式' },
      add_requirement: { title: '补充需求', placeholder: '请补充嘉宾、餐厅、到场或禁忌事项' }
    };
    const config = actionMap[type];
    wx.showModal({
      title: config.title,
      editable: true,
      placeholderText: config.placeholder,
      confirmText: '提交',
      success: res => {
        if (res.confirm) {
          this.createSupportRequest(type, res.content || config.title);
        }
      }
    });
  },

  cancelOrder() {
    if (!this.data.order) return;
    wx.showModal({
      title: '取消订单',
      editable: true,
      placeholderText: '请填写取消原因，客服会根据订单阶段确认后续处理',
      confirmText: '确认取消',
      success: async res => {
        if (!res.confirm || !this.data.order) return;
        try {
          const order = await api.cancelOrder(this.data.order.id, res.content || '客户主动取消');
          this.setOrder(order);
          wx.showToast({ title: '已提交取消', icon: 'success' });
        } catch (error) {
          wx.showToast({ title: (error as Error).message || '取消失败', icon: 'none' });
        }
      }
    });
  },

  async createSupportRequest(type: SupportRequestType, content: string) {
    if (!this.data.order) return;
    try {
      const result = await api.requestOrderSupport(this.data.order.id, type, content);
      wx.showModal({
        title: result.accepted ? '已提交' : '未提交',
        content: result.message,
        showCancel: false
      });
    } catch (error) {
      wx.showToast({ title: (error as Error).message || '提交失败', icon: 'none' });
    }
  },

  async payAgain() {
    if (!this.data.order) return;
    try {
      await ensureCustomerLogin();
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
