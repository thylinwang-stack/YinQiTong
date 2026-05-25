import { BusinessException } from '@/common/errors/business.exception';
import { OrderStatus } from '@/modules/orders/enums/order-status.enum';
import { OrderStateMachineService } from '@/modules/orders/order-state-machine.service';
import { PaymentService } from '../payment.service';
import { MockPaymentProvider } from '../providers/mock-payment.provider';
import {
  CreateAuditLogInput,
  CreateOrderStatusLogInput,
  CreatePaymentCallbackLogInput,
  CreatePaymentRecordInput,
  PaymentCallbackLogRecord,
  PaymentOrderRecord,
  PaymentRecord,
  PaymentRepository,
  RefundRecord
} from '../repositories/payment.repository';

class InMemoryPaymentRepository implements PaymentRepository {
  orders = new Map<string, PaymentOrderRecord>();
  payments = new Map<string, PaymentRecord>();
  refunds = new Map<string, RefundRecord>();
  callbackLogs = new Map<string, PaymentCallbackLogRecord>();
  statusLogs: CreateOrderStatusLogInput[] = [];
  auditLogs: CreateAuditLogInput[] = [];

  transaction<T>(handler: (repo: PaymentRepository) => Promise<T>): Promise<T> {
    return handler(this);
  }

  findOrderById(orderId: string): Promise<PaymentOrderRecord | null> {
    return Promise.resolve(this.orders.get(orderId) || null);
  }

  findPaymentByNo(paymentNo: string): Promise<PaymentRecord | null> {
    return Promise.resolve(this.payments.get(paymentNo) || null);
  }

  findLatestPaidPaymentByOrder(orderId: string): Promise<PaymentRecord | null> {
    const result = [...this.payments.values()].find(item => item.orderId === orderId && item.status === 'paid') || null;
    return Promise.resolve(result);
  }

  createPayment(input: CreatePaymentRecordInput): Promise<PaymentRecord> {
    const payment: PaymentRecord = {
      id: `payment_${this.payments.size + 1}`,
      paymentNo: input.paymentNo,
      orderId: input.orderId,
      provider: input.provider,
      subject: input.subject,
      amount: input.amount,
      status: 'pending'
    };
    this.payments.set(payment.paymentNo, payment);
    return Promise.resolve(payment);
  }

  attachPrepayResult(_paymentNo: string, _providerPrepayId: string, _rawResponse: Record<string, unknown>): Promise<void> {
    return Promise.resolve();
  }

  markPaymentPaid(input: { paymentNo: string; providerTransactionId: string; paidAt?: Date }): Promise<PaymentRecord> {
    const payment = this.payments.get(input.paymentNo);
    if (!payment) throw new Error('payment not found');
    const updated = {
      ...payment,
      status: 'paid' as const,
      providerTransactionId: input.providerTransactionId
    };
    this.payments.set(input.paymentNo, updated);
    return Promise.resolve(updated);
  }

  incrementOrderPaidAmount(orderId: string, amount: number): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('order not found');
    this.orders.set(orderId, { ...order, paidAmount: Number(order.paidAmount) + amount });
    return Promise.resolve();
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Promise<PaymentOrderRecord> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('order not found');
    const updated = { ...order, status };
    this.orders.set(orderId, updated);
    return Promise.resolve(updated);
  }

  createOrderStatusLog(input: CreateOrderStatusLogInput): Promise<void> {
    this.statusLogs.push(input);
    return Promise.resolve();
  }

  createAuditLog(input: CreateAuditLogInput): Promise<void> {
    this.auditLogs.push(input);
    return Promise.resolve();
  }

  findPaymentCallbackLog(provider: any, eventId: string): Promise<PaymentCallbackLogRecord | null> {
    return Promise.resolve(this.callbackLogs.get(`${provider}:${eventId}`) || null);
  }

  createPaymentCallbackLog(input: CreatePaymentCallbackLogInput): Promise<PaymentCallbackLogRecord> {
    const log = {
      id: `callback_${this.callbackLogs.size + 1}`,
      provider: input.provider,
      eventId: input.eventId,
      processed: false
    };
    this.callbackLogs.set(`${input.provider}:${input.eventId}`, log);
    return Promise.resolve(log);
  }

  markPaymentCallbackLogProcessed(provider: any, eventId: string): Promise<void> {
    const key = `${provider}:${eventId}`;
    const log = this.callbackLogs.get(key);
    if (log) this.callbackLogs.set(key, { ...log, processed: true });
    return Promise.resolve();
  }

  createRefund(input: {
    refundNo: string;
    orderId: string;
    paymentNo?: string;
    amount: number;
    reason: string;
    requestedBy?: string;
  }): Promise<RefundRecord> {
    const refund: RefundRecord = {
      id: `refund_${this.refunds.size + 1}`,
      refundNo: input.refundNo,
      orderId: input.orderId,
      paymentNo: input.paymentNo,
      amount: input.amount,
      status: 'pending',
      reason: input.reason
    };
    this.refunds.set(refund.id, refund);
    return Promise.resolve(refund);
  }

  findRefundById(refundId: string): Promise<RefundRecord | null> {
    return Promise.resolve(this.refunds.get(refundId) || null);
  }

  approveRefund(refundId: string, _approvedBy: string, _remark?: string): Promise<RefundRecord> {
    const refund = this.refunds.get(refundId);
    if (!refund) throw new Error('refund not found');
    const updated = { ...refund, status: 'approved' as const };
    this.refunds.set(refundId, updated);
    return Promise.resolve(updated);
  }

  updateRefundExecution(input: {
    refundId: string;
    status: 'processing' | 'succeeded' | 'failed';
    providerRefundId?: string;
    rawResponse?: Record<string, unknown>;
  }): Promise<RefundRecord> {
    const refund = this.refunds.get(input.refundId);
    if (!refund) throw new Error('refund not found');
    const updated = { ...refund, status: input.status };
    this.refunds.set(input.refundId, updated);
    return Promise.resolve(updated);
  }

  incrementOrderRefundedAmount(orderId: string, amount: number): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('order not found');
    this.orders.set(orderId, { ...order, refundedAmount: Number(order.refundedAmount) + amount });
    return Promise.resolve();
  }
}

describe('PaymentService', () => {
  let repo: InMemoryPaymentRepository;
  let service: PaymentService;

  beforeEach(() => {
    repo = new InMemoryPaymentRepository();
    service = new PaymentService(
      repo,
      { mock: new MockPaymentProvider(), wechat_pay: new MockPaymentProvider() as any },
      new OrderStateMachineService()
    );
  });

  it('creates payment from backend calculated deposit amount and moves quoted order to deposit_pending', async () => {
    repo.orders.set('order_1', {
      id: 'order_1',
      orderNo: 'BS001',
      status: OrderStatus.Quoted,
      totalAmount: 5000,
      depositAmount: 800,
      paidAmount: 0,
      refundedAmount: 0
    });

    const result = await service.createPayment('order_1', { provider: 'mock' });

    expect(result.amount).toBe(800);
    expect(result.subject).toBe('商务接待氛围服务预约金');
    expect(repo.orders.get('order_1')?.status).toBe(OrderStatus.DepositPending);
    expect(repo.payments.get(result.paymentNo)?.amount).toBe(800);
    expect(repo.statusLogs[0]).toMatchObject({
      fromStatus: OrderStatus.Quoted,
      toStatus: OrderStatus.DepositPending
    });
  });

  it('processes payment notify idempotently and updates order to deposit_paid once', async () => {
    repo.orders.set('order_1', {
      id: 'order_1',
      orderNo: 'BS001',
      status: OrderStatus.DepositPending,
      totalAmount: 5000,
      depositAmount: 800,
      paidAmount: 0,
      refundedAmount: 0
    });
    repo.payments.set('PAY001', {
      id: 'payment_1',
      paymentNo: 'PAY001',
      orderId: 'order_1',
      provider: 'mock',
      subject: '商务接待氛围服务预约金',
      amount: 800,
      status: 'pending'
    });

    const raw = JSON.stringify({
      eventId: 'evt_001',
      paymentNo: 'PAY001',
      providerTransactionId: 'tx_001',
      tradeState: 'SUCCESS',
      amount: 800
    });

    const first = await service.handlePaymentNotify(raw, {}, 'mock');
    const second = await service.handlePaymentNotify(raw, {}, 'mock');

    expect(first.processed).toBe(true);
    expect(second.ignored).toBe(true);
    expect(repo.payments.get('PAY001')?.status).toBe('paid');
    expect(repo.orders.get('order_1')?.status).toBe(OrderStatus.DepositPaid);
    expect(repo.orders.get('order_1')?.paidAmount).toBe(800);
    expect(repo.statusLogs).toHaveLength(1);
    expect(repo.callbackLogs.get('mock:evt_001')?.processed).toBe(true);
  });

  it('rejects notify amount mismatch', async () => {
    repo.orders.set('order_1', {
      id: 'order_1',
      orderNo: 'BS001',
      status: OrderStatus.DepositPending,
      totalAmount: 5000,
      depositAmount: 800,
      paidAmount: 0,
      refundedAmount: 0
    });
    repo.payments.set('PAY001', {
      id: 'payment_1',
      paymentNo: 'PAY001',
      orderId: 'order_1',
      provider: 'mock',
      subject: '商务接待氛围服务预约金',
      amount: 800,
      status: 'pending'
    });

    await expect(service.handlePaymentNotify(JSON.stringify({
      eventId: 'evt_bad',
      paymentNo: 'PAY001',
      providerTransactionId: 'tx_bad',
      tradeState: 'SUCCESS',
      amount: 1
    }), {}, 'mock')).rejects.toThrow(BusinessException);

    expect(repo.callbackLogs.get('mock:evt_bad')).toBeTruthy();
  });

  it('creates refund request pending approval and blocks execution before approval', async () => {
    repo.orders.set('order_1', {
      id: 'order_1',
      orderNo: 'BS001',
      status: OrderStatus.Cancelled,
      totalAmount: 5000,
      depositAmount: 800,
      paidAmount: 800,
      refundedAmount: 0
    });
    repo.payments.set('PAY001', {
      id: 'payment_1',
      paymentNo: 'PAY001',
      orderId: 'order_1',
      provider: 'mock',
      subject: '商务接待氛围服务预约金',
      amount: 800,
      status: 'paid',
      providerTransactionId: 'tx_001'
    });

    const refund = await service.refund('order_1', { amount: 500, reason: '客户取消' });

    expect(refund.status).toBe('pending');
    await expect(service.executeApprovedRefund(refund.id, 'mock')).rejects.toThrow(BusinessException);
  });

  it('executes approved refund and moves cancelled order to refunded when provider succeeds', async () => {
    repo.orders.set('order_1', {
      id: 'order_1',
      orderNo: 'BS001',
      status: OrderStatus.Cancelled,
      totalAmount: 5000,
      depositAmount: 800,
      paidAmount: 800,
      refundedAmount: 0
    });
    repo.payments.set('PAY001', {
      id: 'payment_1',
      paymentNo: 'PAY001',
      orderId: 'order_1',
      provider: 'mock',
      subject: '商务接待氛围服务预约金',
      amount: 800,
      status: 'paid',
      providerTransactionId: 'tx_001'
    });

    const refund = await service.refund('order_1', { amount: 800, reason: '客户取消' });
    await service.approveRefund(refund.id, 'admin_1', '同意退款');
    const executed = await service.executeApprovedRefund(refund.id, 'mock');

    expect(executed.status).toBe('succeeded');
    expect(repo.orders.get('order_1')?.refundedAmount).toBe(800);
    expect(repo.orders.get('order_1')?.status).toBe(OrderStatus.Refunded);
  });
});
