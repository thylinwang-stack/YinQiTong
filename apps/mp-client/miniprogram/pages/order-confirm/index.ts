import { api, requestPayment } from '../../services/api';
import { BookingDraft, ServicePackage } from '../../services/types';
import { appStore } from '../../store/app-store';
import { assertBoundaryChecked } from '../../utils/validators';

Page({
  data: {
    form: undefined as BookingDraft | undefined,
    selectedPackage: undefined as ServicePackage | undefined,
    boundaryChecked: false,
    paying: false
  },

  onLoad() {
    const state = appStore.getState();
    if (!state.pendingBooking) {
      wx.showToast({ title: '请先提交需求', icon: 'none' });
      setTimeout(() => wx.navigateTo({ url: '/pages/booking-form/index' }), 600);
      return;
    }
    this.setData({
      form: state.pendingBooking,
      selectedPackage: state.selectedPackage
    });
  },

  onBoundaryChange(event: any) {
    const values = event.detail.value || [];
    this.setData({ boundaryChecked: values.includes('boundary') });
  },

  goPolicy() {
    wx.navigateTo({ url: '/pages/policy/index?tab=service' });
  },

  async pay() {
    const boundary = assertBoundaryChecked(this.data.boundaryChecked);
    if (!boundary.valid) {
      wx.showToast({ title: boundary.message || '请确认协议', icon: 'none' });
      return;
    }
    if (!this.data.form) return;

    this.setData({ paying: true });
    try {
      const { order } = await api.createBooking({
        ...this.data.form,
        boundaryAgreementConfirmed: true,
        protocolVersion: 'service_boundary_v1'
      });
      await api.confirmServiceBoundary({
        orderId: order.id,
        actorType: 'customer',
        protocolVersion: 'service_boundary_v1'
      });
      appStore.setLatestOrder(order);
      const payment = await api.createPayment(order.id);
      await requestPayment(payment);
      const paidOrder = await api.markOrderPaid(order.id);
      if (paidOrder) appStore.setLatestOrder(paidOrder);
      appStore.setPaymentResult({
        orderNo: order.orderNo,
        status: 'success',
        message: '预约金支付成功，平台将进入需求审核与助理匹配流程。'
      });
      appStore.clearDraft();
      wx.redirectTo({ url: '/pages/payment-result/index' });
    } catch (error) {
      const errMsg = String((error as any)?.errMsg || (error as Error)?.message || '');
      const isCancel = errMsg.includes('cancel');
      appStore.setPaymentResult({
        orderNo: appStore.getState().latestOrder?.orderNo || '',
        status: isCancel ? 'cancelled' : 'failed',
        message: isCancel ? '你已取消支付，订单仍保留为待支付状态。' : '支付未完成，请稍后重新发起支付。'
      });
      wx.redirectTo({ url: '/pages/payment-result/index' });
    } finally {
      this.setData({ paying: false });
    }
  }
});
