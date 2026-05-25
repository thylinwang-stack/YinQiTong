import { BusinessException } from '@/common/errors/business.exception';
import {
  OrderStatus,
  OrderTransitionActorType,
  OrderTransitionTrigger
} from '../enums/order-status.enum';
import { OrderStateMachineService } from '../order-state-machine.service';
import { OrderStatusService } from '../order-status.service';
import {
  CreateAuditLogInput,
  CreatePaymentCallbackInput,
  CreateStatusLogInput,
  OrderStatusRecord,
  OrderStatusRepository,
  PaymentCallbackRecord
} from '../repositories/order-status.repository';

class InMemoryOrderStatusRepository implements OrderStatusRepository {
  orders = new Map<string, OrderStatusRecord>();
  callbacks = new Map<string, PaymentCallbackRecord>();
  statusLogs: CreateStatusLogInput[] = [];
  auditLogs: CreateAuditLogInput[] = [];
  paidPayments: Array<{ orderId: string; paymentNo?: string; providerTransactionId?: string }> = [];
  succeededRefunds: Array<{ orderId: string; refundNo: string; paymentNo?: string }> = [];

  transaction<T>(handler: (repo: OrderStatusRepository) => Promise<T>): Promise<T> {
    return handler(this);
  }

  findOrderById(orderId: string): Promise<OrderStatusRecord | null> {
    return Promise.resolve(this.orders.get(orderId) || null);
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderStatusRecord> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('order not found');
    const updated = { ...order, status };
    this.orders.set(orderId, updated);
    return Promise.resolve(updated);
  }

  createStatusLog(input: CreateStatusLogInput): Promise<void> {
    this.statusLogs.push(input);
    return Promise.resolve();
  }

  createAuditLog(input: CreateAuditLogInput): Promise<void> {
    this.auditLogs.push(input);
    return Promise.resolve();
  }

  findPaymentCallback(provider: string, eventId: string): Promise<PaymentCallbackRecord | null> {
    return Promise.resolve(this.callbacks.get(`${provider}:${eventId}`) || null);
  }

  createPaymentCallback(input: CreatePaymentCallbackInput): Promise<PaymentCallbackRecord> {
    const callback = {
      id: `cb_${this.callbacks.size + 1}`,
      provider: input.provider,
      eventId: input.eventId,
      processed: false
    };
    this.callbacks.set(`${input.provider}:${input.eventId}`, callback);
    return Promise.resolve(callback);
  }

  markPaymentCallbackProcessed(provider: string, eventId: string): Promise<void> {
    const key = `${provider}:${eventId}`;
    const callback = this.callbacks.get(key);
    if (callback) {
      this.callbacks.set(key, { ...callback, processed: true });
    }
    return Promise.resolve();
  }

  markPaymentPaid(input: { orderId: string; paymentNo?: string; providerTransactionId?: string }): Promise<void> {
    this.paidPayments.push(input);
    return Promise.resolve();
  }

  markRefundSucceeded(input: { orderId: string; refundNo: string; paymentNo?: string }): Promise<void> {
    this.succeededRefunds.push(input);
    return Promise.resolve();
  }
}

describe('OrderStatusService', () => {
  let repo: InMemoryOrderStatusRepository;
  let service: OrderStatusService;

  beforeEach(() => {
    repo = new InMemoryOrderStatusRepository();
    service = new OrderStatusService(new OrderStateMachineService(), repo);
  });

  it('transitions an order and writes status log plus audit log', async () => {
    repo.orders.set('order_1', { id: 'order_1', status: OrderStatus.Draft });

    const result = await service.transition('order_1', {
      toStatus: OrderStatus.Submitted,
      trigger: OrderTransitionTrigger.CustomerSubmit,
      actorType: OrderTransitionActorType.Customer,
      actorId: 'customer_1',
      reason: '客户提交需求'
    });

    expect(result.toStatus).toBe(OrderStatus.Submitted);
    expect(repo.orders.get('order_1')?.status).toBe(OrderStatus.Submitted);
    expect(repo.statusLogs).toHaveLength(1);
    expect(repo.statusLogs[0]).toMatchObject({
      fromStatus: OrderStatus.Draft,
      toStatus: OrderStatus.Submitted,
      trigger: OrderTransitionTrigger.CustomerSubmit
    });
    expect(repo.auditLogs).toHaveLength(1);
    expect(repo.auditLogs[0].action).toBe('order.status.draft_to_submitted');
  });

  it('throws business error for illegal transition and does not write logs', async () => {
    repo.orders.set('order_1', { id: 'order_1', status: OrderStatus.Draft });

    await expect(service.transition('order_1', {
      toStatus: OrderStatus.DepositPaid,
      trigger: OrderTransitionTrigger.AdminOverride,
      actorType: OrderTransitionActorType.Admin
    })).rejects.toThrow(BusinessException);

    expect(repo.statusLogs).toHaveLength(0);
    expect(repo.auditLogs).toHaveLength(0);
  });

  it('updates deposit_pending to deposit_paid from payment callback idempotently', async () => {
    repo.orders.set('order_1', { id: 'order_1', status: OrderStatus.DepositPending });

    const first = await service.handleDepositPaidCallback({
      provider: 'wechat_pay',
      eventId: 'evt_1',
      orderId: 'order_1',
      paymentNo: 'pay_1',
      providerTransactionId: 'wx_tx_1',
      rawPayload: { id: 'evt_1' }
    });

    const second = await service.handleDepositPaidCallback({
      provider: 'wechat_pay',
      eventId: 'evt_1',
      orderId: 'order_1',
      paymentNo: 'pay_1',
      providerTransactionId: 'wx_tx_1',
      rawPayload: { id: 'evt_1' }
    });

    expect(first.toStatus).toBe(OrderStatus.DepositPaid);
    expect(second.ignored).toBe(true);
    expect(repo.orders.get('order_1')?.status).toBe(OrderStatus.DepositPaid);
    expect(repo.paidPayments).toHaveLength(1);
    expect(repo.statusLogs).toHaveLength(1);
    expect(repo.callbacks.get('wechat_pay:evt_1')?.processed).toBe(true);
  });

  it('supports cancel then refund flow', async () => {
    repo.orders.set('order_1', { id: 'order_1', status: OrderStatus.DepositPaid });

    await service.cancelOrder('order_1', {
      actorType: OrderTransitionActorType.Admin,
      actorId: 'admin_1',
      reason: '客户取消，需退款'
    });

    await service.refundOrder('order_1', {
      refundNo: 'refund_1',
      paymentNo: 'pay_1',
      reason: '退款成功',
      actorId: 'admin_1'
    });

    expect(repo.orders.get('order_1')?.status).toBe(OrderStatus.Refunded);
    expect(repo.succeededRefunds).toEqual([{ orderId: 'order_1', refundNo: 'refund_1', paymentNo: 'pay_1' }]);
    expect(repo.statusLogs.map(log => log.toStatus)).toEqual([OrderStatus.Cancelled, OrderStatus.Refunded]);
  });

  it('supports admin exception flow', async () => {
    repo.orders.set('order_1', { id: 'order_1', status: OrderStatus.Matching });

    const result = await service.markException('order_1', 'admin_1', '客户需求异常');

    expect(result.toStatus).toBe(OrderStatus.Exception);
    expect(repo.orders.get('order_1')?.status).toBe(OrderStatus.Exception);
    expect(repo.auditLogs[0]).toMatchObject({
      action: 'order.status.matching_to_exception',
      resourceType: 'order'
    });
  });

  it('completes service and enters settlement_pending when auto settlement is enabled', async () => {
    repo.orders.set('order_1', { id: 'order_1', status: OrderStatus.Executing });

    const result = await service.completeService('order_1', 'admin_1', true);

    expect(result.toStatus).toBe(OrderStatus.SettlementPending);
    expect(repo.orders.get('order_1')?.status).toBe(OrderStatus.SettlementPending);
    expect(repo.statusLogs.map(log => log.toStatus)).toEqual([
      OrderStatus.Completed,
      OrderStatus.SettlementPending
    ]);
  });
});
