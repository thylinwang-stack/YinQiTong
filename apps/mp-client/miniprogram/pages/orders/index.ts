import { api } from '../../services/api';
import { BookingOrder, BookingStatus } from '../../services/types';
import { bookingStatusText } from '../../utils/format';

const tabs = [
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'pending_payment' },
  { label: '待匹配', value: 'pending_match' },
  { label: '服务中', value: 'in_service' },
  { label: '已完成', value: 'completed' },
  { label: '已评价', value: 'reviewed' },
  { label: '已取消', value: 'cancelled' }
];

type OrderListItem = BookingOrder & {
  statusText: string;
  showReviewAction: boolean;
  reviewActionText: string;
};

Page({
  data: {
    tabs,
    activeStatus: 'all',
    orders: [] as OrderListItem[],
    visibleOrders: [] as OrderListItem[],
    loading: false,
    error: ''
  },

  async onShow() {
    await this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true, error: '' });
    try {
      const orders = (await api.getMyOrders()).map(toOrderListItem);
      this.setData({ orders });
      this.filterOrders();
    } catch (error) {
      this.setData({
        orders: [],
        visibleOrders: [],
        error: (error as Error).message || '订单加载失败'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  changeTab(event: WechatMiniprogram.BaseEvent) {
    this.setData({ activeStatus: event.currentTarget.dataset.status });
    this.filterOrders();
  },

  filterOrders() {
    const active = this.data.activeStatus;
    this.setData({
      visibleOrders: active === 'all'
        ? this.data.orders
        : this.data.orders.filter(item => item.status === (active as BookingStatus))
    });
  },

  openDetail(event: WechatMiniprogram.BaseEvent) {
    wx.navigateTo({ url: `/pages/order-detail/index?id=${event.currentTarget.dataset.id}` });
  },

  openReview(event: WechatMiniprogram.BaseEvent) {
    const order = this.data.orders.find(item => item.id === event.currentTarget.dataset.id);
    if (!order) return;
    const token = order.reviewToken || `review_${order.orderNo}`;
    wx.navigateTo({ url: `/pages/service-review/index?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(token)}` });
  },

  goBooking() {
    wx.navigateTo({ url: '/pages/booking-form/index' });
  },

  retry() {
    this.loadOrders();
  }
});

function toOrderListItem(order: BookingOrder): OrderListItem {
  const reviewSubmitted = order.status === 'reviewed' || order.reviewStatus === 'submitted';
  return {
    ...order,
    statusText: bookingStatusText[order.status],
    showReviewAction: order.status === 'completed' || order.status === 'reviewed',
    reviewActionText: reviewSubmitted ? '查看评价' : '评价服务'
  };
}
