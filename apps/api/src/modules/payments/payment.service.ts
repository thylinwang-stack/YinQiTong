import { HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BusinessException } from '@/common/errors/business.exception';
import {
  OrderStatus,
  OrderTransitionActorType,
  OrderTransitionTrigger,
  PAID_OR_AFTER_STATUSES
} from '@/modules/orders/enums/order-status.enum';
import { OrderStateMachineService } from '@/modules/orders/order-state-machine.service';
import { CreatePaymentDto, RefundRequestDto } from './dto/payment.dto';
import {
  PAYMENT_PROVIDER_REGISTRY,
  PaymentProvider,
  PaymentProviderName,
  WxRequestPaymentParams
} from './providers/payment-provider.interface';
import {
  PAYMENT_REPOSITORY,
  PaymentOrderRecord,
  PaymentRecord,
  PaymentRepository,
  RefundRecord
} from './repositories/payment.repository';

export interface CreatePaymentResponse {
  paymentNo: string;
  provider: PaymentProviderName;
  amount: number;
  subject: string;
  requestPaymentParams: WxRequestPaymentParams;
}

export interface PaymentNotifyResult {
  paymentNo?: string;
  orderId?: string;
  processed: boolean;
  ignored?: boolean;
}

const DEPOSIT_SUBJECT = '商务接待氛围服务预约金';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly repository: PaymentRepository,
    @Inject(PAYMENT_PROVIDER_REGISTRY)
    private readonly providers: Record<PaymentProviderName, PaymentProvider>,
    private readonly orderStateMachine: OrderStateMachineService
  ) {}

  async createPayment(orderId: string, dto: CreatePaymentDto = {}, actor?: { id: string; userType?: string }): Promise<CreatePaymentResponse> {
    const providerName = dto.provider || this.getDefaultProviderName();
    const provider = this.getProvider(providerName);
    const notifyUrl = process.env.PAYMENT_NOTIFY_URL || 'https://example.com/api/payments/notify';

    const { order, payment } = await this.repository.transaction(async repo => {
      const order = await this.findOrderOrThrow(repo, orderId);
      this.assertOrderAccessible(order, actor);
      this.assertOrderPayable(order);

      if (order.status === OrderStatus.Quoted) {
        await this.transitionOrder(repo, order, OrderStatus.DepositPending, {
          trigger: OrderTransitionTrigger.DepositRequested,
          actorType: OrderTransitionActorType.System,
          reason: 'create deposit payment'
        });
        order.status = OrderStatus.DepositPending;
      }

      const amount = this.calculateDepositAmount(order);
      const payment = await repo.createPayment({
        paymentNo: this.createNo('PAY'),
        orderId: order.id,
        provider: providerName,
        subject: DEPOSIT_SUBJECT,
        amount,
        currency: 'CNY'
      });

      await repo.createAuditLog({
        actorType: OrderTransitionActorType.System,
        action: 'payment.create',
        resourceType: 'payment',
        resourceId: payment.id,
        afterData: {
          paymentNo: payment.paymentNo,
          orderId,
          amount,
          provider: providerName,
          subject: DEPOSIT_SUBJECT
        },
        metadata: { orderNo: order.orderNo }
      });

      return { order, payment };
    });

    const prepay = await provider.createPrepay({
      paymentNo: payment.paymentNo,
      orderNo: order.orderNo,
      amount: Number(payment.amount),
      description: payment.subject,
      payerOpenid: dto.payerOpenid,
      notifyUrl
    });

    await this.repository.attachPrepayResult(payment.paymentNo, prepay.providerPrepayId, prepay.rawResponse);

    return {
      paymentNo: payment.paymentNo,
      provider: providerName,
      amount: Number(payment.amount),
      subject: payment.subject,
      requestPaymentParams: prepay.requestPaymentParams
    };
  }

  async handlePaymentNotify(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
    providerName: PaymentProviderName = this.getDefaultProviderName()
  ): Promise<PaymentNotifyResult> {
    const provider = this.getProvider(providerName);
    const event = await provider.verifyNotify(rawBody, headers).catch(async error => {
      await this.recordUnverifiedCallback(providerName, rawBody, headers, error);
      throw error;
    });

    const existingLog = await this.repository.transaction(repo =>
      repo.findPaymentCallbackLog(providerName, event.eventId)
    );
    if (existingLog?.processed) {
      return { paymentNo: event.paymentNo, processed: true, ignored: true };
    }
    if (!existingLog) {
      await this.repository.transaction(async repo => {
        await repo.createPaymentCallbackLog({
          provider: providerName,
          eventId: event.eventId,
          paymentNo: event.paymentNo,
          providerTransactionId: event.providerTransactionId,
          rawBody: event.rawPayload,
          headers: this.normalizeHeaders(headers)
        });
      });
    }

    return this.repository.transaction(async repo => {
      const payment = await repo.findPaymentByNo(event.paymentNo);
      if (!payment) {
        throw new NotFoundException('支付单不存在');
      }

      if (payment.status === 'paid') {
        await repo.markPaymentCallbackLogProcessed(providerName, event.eventId);
        await repo.createAuditLog({
          actorType: OrderTransitionActorType.PaymentProvider,
          action: 'payment.notify_duplicated',
          resourceType: 'payment',
          resourceId: payment.id,
          metadata: {
            eventId: event.eventId,
            paymentNo: event.paymentNo,
            providerTransactionId: event.providerTransactionId
          }
        });
        return { paymentNo: payment.paymentNo, orderId: payment.orderId, processed: true, ignored: true };
      }

      if (event.tradeState !== 'SUCCESS') {
        throw new BusinessException('PAYMENT_NOTIFY_NOT_SUCCESS', `支付回调状态不是 SUCCESS：${event.tradeState}`);
      }

      this.assertPaymentAmountMatched(payment, event.amount);

      const order = await this.findOrderOrThrow(repo, payment.orderId);
      const paidPayment = await repo.markPaymentPaid({
        paymentNo: payment.paymentNo,
        providerTransactionId: event.providerTransactionId,
        paidAt: event.paidAt
      });
      await repo.incrementOrderPaidAmount(order.id, Number(payment.amount));

      if (order.status === OrderStatus.DepositPending) {
        await this.transitionOrder(repo, order, OrderStatus.DepositPaid, {
          trigger: OrderTransitionTrigger.PaymentCallback,
          actorType: OrderTransitionActorType.PaymentProvider,
          reason: 'payment notify verified',
          metadata: {
            eventId: event.eventId,
            paymentNo: payment.paymentNo,
            providerTransactionId: event.providerTransactionId
          }
        });
      } else if (!PAID_OR_AFTER_STATUSES.has(order.status)) {
        throw new BusinessException(
          'PAYMENT_ORDER_STATUS_INVALID',
          '支付回调只能把 deposit_pending 状态订单更新为 deposit_paid',
          undefined,
          { currentStatus: order.status }
        );
      }

      await repo.markPaymentCallbackLogProcessed(providerName, event.eventId);
      await repo.createAuditLog({
        actorType: OrderTransitionActorType.PaymentProvider,
        action: 'payment.notify_processed',
        resourceType: 'payment',
        resourceId: paidPayment.id,
        beforeData: { status: payment.status },
        afterData: { status: paidPayment.status, providerTransactionId: event.providerTransactionId },
        metadata: {
          eventId: event.eventId,
          orderId: order.id,
          orderNo: order.orderNo
        }
      });

      return { paymentNo: payment.paymentNo, orderId: order.id, processed: true };
    });
  }

  async refund(orderId: string, dto: RefundRequestDto): Promise<RefundRecord> {
    return this.repository.transaction(async repo => {
      const order = await this.findOrderOrThrow(repo, orderId);
      const refundable = Number(order.paidAmount) - Number(order.refundedAmount);
      if (dto.amount <= 0 || dto.amount > refundable) {
        throw new BusinessException(
          'REFUND_AMOUNT_INVALID',
          '退款金额必须大于 0，且不能超过可退金额',
          undefined,
          { amount: dto.amount, refundable }
        );
      }

      const latestPayment = await repo.findLatestPaidPaymentByOrder(orderId);
      if (!latestPayment) {
        throw new BusinessException('REFUND_PAYMENT_NOT_FOUND', '没有可退款的已支付流水');
      }

      const refund = await repo.createRefund({
        refundNo: this.createNo('REF'),
        orderId,
        paymentNo: latestPayment.paymentNo,
        amount: dto.amount,
        reason: dto.reason,
        requestedBy: dto.requestedBy
      });

      await repo.createAuditLog({
        actorId: dto.requestedBy,
        actorType: OrderTransitionActorType.Admin,
        action: 'refund.request_create',
        resourceType: 'refund',
        resourceId: refund.id,
        afterData: {
          refundNo: refund.refundNo,
          orderId,
          amount: dto.amount,
          status: refund.status
        },
        metadata: { reason: dto.reason }
      });

      return refund;
    });
  }

  async approveRefund(refundId: string, approvedBy: string, remark?: string): Promise<RefundRecord> {
    return this.repository.transaction(async repo => {
      const refund = await this.findRefundOrThrow(repo, refundId);
      if (refund.status !== 'pending') {
        throw new BusinessException('REFUND_APPROVAL_STATUS_INVALID', '只有 pending 退款可以审批通过');
      }

      const approved = await repo.approveRefund(refundId, approvedBy, remark);
      await repo.createAuditLog({
        actorId: approvedBy,
        actorType: OrderTransitionActorType.Admin,
        action: 'refund.approve',
        resourceType: 'refund',
        resourceId: refundId,
        beforeData: { status: refund.status },
        afterData: { status: approved.status },
        metadata: { remark }
      });
      return approved;
    });
  }

  async executeApprovedRefund(refundId: string, providerName?: PaymentProviderName): Promise<RefundRecord> {
    const refund = await this.repository.transaction(async repo => this.findRefundOrThrow(repo, refundId));
    if (refund.status !== 'approved') {
      throw new BusinessException('REFUND_NOT_APPROVED', '退款必须审批通过后才能执行');
    }

    const order = await this.repository.transaction(async repo => this.findOrderOrThrow(repo, refund.orderId));
    const payment = await this.repository.transaction(async repo => repo.findPaymentByNo(String(refund.paymentNo)));
    if (!payment) {
      throw new BusinessException('REFUND_PAYMENT_NOT_FOUND', '退款关联的支付单不存在');
    }

    const provider = this.getProvider(providerName || payment.provider);
    const result = await provider.refund({
      refundNo: refund.refundNo,
      paymentNo: payment.paymentNo,
      providerTransactionId: payment.providerTransactionId || undefined,
      amount: Number(refund.amount),
      totalAmount: Number(payment.amount),
      reason: String(refund.reason || ''),
      notifyUrl: process.env.REFUND_NOTIFY_URL || 'https://example.com/api/payments/refund-notify'
    });

    return this.repository.transaction(async repo => {
      const updated = await repo.updateRefundExecution({
        refundId,
        status: result.status,
        providerRefundId: result.providerRefundId,
        rawResponse: result.rawResponse
      });

      if (updated.status === 'succeeded') {
        await repo.incrementOrderRefundedAmount(order.id, Number(refund.amount));
        if ([OrderStatus.Cancelled, OrderStatus.Exception].includes(order.status)) {
          await this.transitionOrder(repo, order, OrderStatus.Refunded, {
            trigger: OrderTransitionTrigger.RefundSucceeded,
            actorType: OrderTransitionActorType.Admin,
            reason: String(refund.reason || ''),
            metadata: { refundNo: refund.refundNo, providerRefundId: result.providerRefundId }
          });
        }
      }

      await repo.createAuditLog({
        actorType: OrderTransitionActorType.Admin,
        action: 'refund.execute',
        resourceType: 'refund',
        resourceId: refundId,
        beforeData: { status: refund.status },
        afterData: { status: updated.status, providerRefundId: result.providerRefundId },
        metadata: result.rawResponse
      });

      return updated;
    });
  }

  private assertOrderPayable(order: PaymentOrderRecord) {
    if (![OrderStatus.Quoted, OrderStatus.DepositPending].includes(order.status)) {
      throw new BusinessException(
        'ORDER_NOT_PAYABLE',
        '订单当前状态不能发起预约金支付',
        undefined,
        { currentStatus: order.status }
      );
    }
  }

  private assertOrderAccessible(order: PaymentOrderRecord, actor?: { id: string; userType?: string }) {
    if (!actor || actor.userType !== 'customer') return;
    if (order.customerUserId !== actor.id) {
      throw new BusinessException('PAYMENT_ORDER_ACCESS_DENIED', '无权为该订单发起支付', HttpStatus.FORBIDDEN);
    }
  }

  private calculateDepositAmount(order: PaymentOrderRecord): number {
    const configuredDeposit = Number(order.depositAmount);
    if (configuredDeposit > 0) return configuredDeposit;

    const rate = Number(process.env.PAYMENT_DEPOSIT_RATE || 0.3);
    const totalAmount = Number(order.totalAmount);
    return Math.max(0.01, Math.round(totalAmount * rate * 100) / 100);
  }

  private assertPaymentAmountMatched(payment: PaymentRecord, notifyAmount: number) {
    const expected = Number(payment.amount);
    if (notifyAmount > 0 && Math.abs(expected - notifyAmount) > 0.001) {
      throw new BusinessException(
        'PAYMENT_AMOUNT_MISMATCH',
        '支付回调金额与后端支付单金额不一致',
        undefined,
        { expected, actual: notifyAmount }
      );
    }
  }

  private async transitionOrder(
    repo: PaymentRepository,
    order: PaymentOrderRecord,
    toStatus: OrderStatus,
    input: {
      trigger: OrderTransitionTrigger;
      actorType: OrderTransitionActorType;
      reason?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    this.orderStateMachine.assertTransition({
      fromStatus: order.status,
      toStatus,
      trigger: input.trigger,
      actorType: input.actorType
    });

    await repo.updateOrderStatus(order.id, toStatus);
    await repo.createOrderStatusLog({
      orderId: order.id,
      fromStatus: order.status,
      toStatus,
      trigger: input.trigger,
      actorType: input.actorType,
      reason: input.reason,
      metadata: input.metadata
    });
    await repo.createAuditLog({
      actorType: input.actorType,
      action: `order.status.${order.status}_to_${toStatus}`,
      resourceType: 'order',
      resourceId: order.id,
      beforeData: { status: order.status },
      afterData: { status: toStatus },
      metadata: {
        trigger: input.trigger,
        reason: input.reason,
        ...(input.metadata || {})
      }
    });
  }

  private async findOrderOrThrow(repo: PaymentRepository, orderId: string): Promise<PaymentOrderRecord> {
    const order = await repo.findOrderById(orderId);
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  private async findRefundOrThrow(repo: PaymentRepository, refundId: string): Promise<RefundRecord> {
    const refund = await repo.findRefundById(refundId);
    if (!refund) throw new NotFoundException('退款单不存在');
    return refund;
  }

  private async recordUnverifiedCallback(
    provider: PaymentProviderName,
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
    error: unknown
  ) {
    const rawPayload = this.parseRawPayload(rawBody);
    const eventId = String(
      rawPayload.id ||
      rawPayload.eventId ||
      headers['wechatpay-serial'] ||
      `unverified_${Date.now()}_${randomUUID().slice(0, 8)}`
    );

    await this.repository.transaction(async repo => {
      await repo.createPaymentCallbackLog({
        provider,
        eventId,
        paymentNo: typeof rawPayload.out_trade_no === 'string' ? rawPayload.out_trade_no : undefined,
        providerTransactionId: typeof rawPayload.transaction_id === 'string' ? rawPayload.transaction_id : undefined,
        rawBody: rawPayload,
        headers: this.normalizeHeaders(headers)
      });
      await repo.createAuditLog({
        actorType: OrderTransitionActorType.PaymentProvider,
        action: 'payment.notify_verify_failed',
        resourceType: 'payment_callback',
        resourceId: eventId,
        metadata: {
          provider,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    });
  }

  private parseRawPayload(rawBody: Buffer | string): Record<string, unknown> {
    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    try {
      return JSON.parse(text || '{}') as Record<string, unknown>;
    } catch {
      return { raw: text };
    }
  }

  private getProvider(name: PaymentProviderName): PaymentProvider {
    const provider = this.providers[name];
    if (!provider) {
      throw new BusinessException('PAYMENT_PROVIDER_NOT_SUPPORTED', `不支持的支付渠道：${name}`);
    }
    return provider;
  }

  private getDefaultProviderName(): PaymentProviderName {
    const value = process.env.PAYMENT_PROVIDER || 'mock';
    return value === 'wechat_pay' ? 'wechat_pay' : 'mock';
  }

  private createNo(prefix: 'PAY' | 'REF'): string {
    const time = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    return `${prefix}${time}${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  private normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(',') : value])
    );
  }
}
