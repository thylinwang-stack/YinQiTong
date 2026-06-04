import { api, ensureCustomerLogin, requestPayment } from '../../services/api';
import { appStore } from '../../store/app-store';
import { openPlatformCustomerService } from '../../services/customer-service';
import { BookingOrder, SupportRequestType } from '../../services/types';
import { bookingStatusText } from '../../utils/format';

const steps = [
  { key: 'pending_payment', name: '支付预约金', desc: '确认服务边界后支付预约金' },
  { key: 'pending_match', name: '平台匹配', desc: '运营根据城市、档期和场景匹配服务团队' },
  { key: 'brief_preparing', name: '餐前准备', desc: '客服整理接待目标、话题建议和禁止事项' },
  { key: 'ready_for_service', name: '待服务', desc: '服务团队确认任务并阅读餐前简报' },
  { key: 'in_service', name: '服务中', desc: '现场协同与礼宾接待执行中' },
  { key: 'completed', name: '待评价', desc: '服务完成，请评价服务团队' },
  { key: 'reviewed', name: '已评价', desc: '评价已提交，平台进入服务复盘' }
];

Page({
  data: {
    order: undefined as BookingOrder | undefined,
    statusText: '',
    steps,
    activeStep: 0,
    assuranceItems: [] as Array<{ title: string; desc: string; status: string; statusText: string }>,
    assistantSummaries: [] as NonNullable<BookingOrder['assistants']>,
    canOpenReview: false,
    reviewActionText: '评价服务',
    reviewSharePath: '',
    reviewStatusText: '未开放',
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
    const canOpenReview = order.status === 'completed' || order.status === 'reviewed';
    const reviewSubmitted = order.status === 'reviewed' || order.reviewStatus === 'submitted';
    const reviewSharePath = buildReviewSharePath(order);
    this.setData({
      order,
      statusText: bookingStatusText[order.status],
      activeStep: currentIndex >= 0 ? currentIndex : 0,
      assuranceItems: buildAssuranceItems(order),
      assistantSummaries: order.assistants || [],
      canOpenReview,
      reviewActionText: reviewSubmitted ? '查看评价' : '评价服务',
      reviewSharePath,
      reviewStatusText: reviewSubmitted ? '已评价' : canOpenReview ? '待评价' : '服务完成后开放'
    });
  },

  onShareAppMessage(event?: WechatMiniprogram.Page.IShareAppMessageOption) {
    const order = this.data.order;
    const shareType = event?.target?.dataset?.shareType;
    if (order && shareType === 'service-review') {
      return {
        title: `请评价 ${order.orderNo} 服务体验`,
        path: this.data.reviewSharePath
      };
    }
    return {
      title: order ? `${order.orderNo} 订单进度` : '有个饭局订单',
      path: order ? `/pages/order-detail/index?id=${order.id}` : '/pages/orders/index'
    };
  },

  openReview() {
    if (!this.data.order || !this.data.canOpenReview) {
      wx.showToast({ title: '服务完成后开放评价', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: this.data.reviewSharePath });
  },

  contactService() {
    this.openCustomerService('contact_service', '客户从订单详情发起客服咨询');
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
          this.openCustomerService(type, res.content || config.title);
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

  async openCustomerService(type: SupportRequestType, content: string) {
    if (!this.data.order) return;
    try {
      wx.showLoading({ title: '连接客服' });
      await openPlatformCustomerService({
        order: this.data.order,
        type,
        content
      });
    } catch (error) {
      wx.showToast({ title: (error as Error).message || '客服入口未打开', icon: 'none' });
    } finally {
      wx.hideLoading();
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

function buildReviewSharePath(order: BookingOrder): string {
  const token = order.reviewToken || `review_${order.orderNo}`;
  return `/pages/service-review/index?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(token)}`;
}

function buildAssuranceItems(order: BookingOrder) {
  const statusOrder = steps.findIndex(item => item.key === order.status);
  const reviewDone = order.status === 'reviewed' || order.reviewStatus === 'submitted';
  const hasAssistant = Boolean(order.assistants?.length);
  const make = (done: boolean, doing: boolean) => ({
    status: done ? 'done' : doing ? 'doing' : 'pending',
    statusText: done ? '已完成' : doing ? '推进中' : '待推进'
  });

  return [
    {
      title: '服务边界确认',
      desc: '客户与服务团队均需确认平台服务边界，避免越界沟通。',
      ...make(Boolean(order.boundaryConfirmed), !order.boundaryConfirmed)
    },
    {
      title: '平台匹配与备选',
      desc: '运营按城市、档期、场景和风格标签匹配，不直接购买某个人。',
      ...make(statusOrder >= 1 || hasAssistant, order.status === 'pending_payment')
    },
    {
      title: '餐前简报',
      desc: '宴请主题、嘉宾背景、推荐话题和禁忌事项进入餐前准备。',
      ...make(statusOrder >= 2, statusOrder === 1)
    },
    {
      title: '受控沟通',
      desc: '改期、补充需求、发票和退款均通过平台客服留痕处理。',
      ...make(true, false)
    },
    {
      title: '服务评价',
      desc: '服务完成后评价服务团队，用于质检、复盘和后续匹配。',
      ...make(reviewDone, order.status === 'completed')
    }
  ];
}
