import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OrderStatus } from '@/modules/orders/enums/order-status.enum';
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
} from './payment.repository';

type PrismaLike = any;

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaLike) {}

  transaction<T>(handler: (repo: PaymentRepository) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => handler(new PrismaPaymentRepository(tx as PrismaLike)));
  }

  async findOrderById(orderId: string): Promise<PaymentOrderRecord | null> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNo: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        paidAmount: true,
        refundedAmount: true,
        customer: { select: { userId: true } }
      }
    });
    if (!order) return null;
    const { customer, ...record } = order;
    return {
      ...record,
      customerUserId: customer?.userId
    };
  }

  findPaymentByNo(paymentNo: string): Promise<PaymentRecord | null> {
    return this.db.payment.findUnique({ where: { paymentNo } });
  }

  findLatestPaidPaymentByOrder(orderId: string): Promise<PaymentRecord | null> {
    return this.db.payment.findFirst({
      where: { orderId, status: 'paid' },
      orderBy: { paidAt: 'desc' }
    });
  }

  createPayment(input: CreatePaymentRecordInput): Promise<PaymentRecord> {
    return this.db.payment.create({
      data: {
        paymentNo: input.paymentNo,
        orderId: input.orderId,
        provider: input.provider,
        subject: input.subject,
        amount: input.amount,
        currency: input.currency,
        providerPrepayId: input.providerPrepayId,
        rawPrepayResponse: input.rawPrepayResponse || {}
      }
    });
  }

  async attachPrepayResult(paymentNo: string, providerPrepayId: string, rawResponse: Record<string, unknown>): Promise<void> {
    await this.db.payment.update({
      where: { paymentNo },
      data: {
        providerPrepayId,
        rawPrepayResponse: rawResponse
      }
    });
  }

  markPaymentPaid(input: { paymentNo: string; providerTransactionId: string; paidAt?: Date }): Promise<PaymentRecord> {
    return this.db.payment.update({
      where: { paymentNo: input.paymentNo },
      data: {
        status: 'paid',
        providerTransactionId: input.providerTransactionId,
        paidAt: input.paidAt || new Date()
      }
    });
  }

  async incrementOrderPaidAmount(orderId: string, amount: number): Promise<void> {
    await this.db.order.update({
      where: { id: orderId },
      data: {
        paidAmount: { increment: amount }
      }
    });
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Promise<PaymentOrderRecord> {
    return this.db.order.update({
      where: { id: orderId },
      data: { status },
      select: {
        id: true,
        orderNo: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        paidAmount: true,
        refundedAmount: true
      }
    });
  }

  async createOrderStatusLog(input: CreateOrderStatusLogInput): Promise<void> {
    await this.db.orderStatusLog.create({
      data: {
        orderId: input.orderId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        trigger: input.trigger,
        actorType: input.actorType,
        reason: input.reason,
        metadata: input.metadata || {}
      }
    });
  }

  async createAuditLog(input: CreateAuditLogInput): Promise<void> {
    await this.db.auditLog.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorType,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        beforeData: input.beforeData,
        afterData: input.afterData,
        metadata: input.metadata || {}
      }
    });
  }

  findPaymentCallbackLog(provider: any, eventId: string): Promise<PaymentCallbackLogRecord | null> {
    return this.db.paymentCallbackLog.findUnique({
      where: { provider_eventId: { provider, eventId } }
    });
  }

  createPaymentCallbackLog(input: CreatePaymentCallbackLogInput): Promise<PaymentCallbackLogRecord> {
    return this.db.paymentCallbackLog.create({
      data: {
        provider: input.provider,
        eventId: input.eventId,
        paymentNo: input.paymentNo,
        providerTransactionId: input.providerTransactionId,
        rawBody: input.rawBody,
        headers: input.headers,
        processed: false
      }
    });
  }

  async markPaymentCallbackLogProcessed(provider: any, eventId: string): Promise<void> {
    await this.db.paymentCallbackLog.update({
      where: { provider_eventId: { provider, eventId } },
      data: { processed: true, processedAt: new Date() }
    });
  }

  createRefund(input: {
    refundNo: string;
    orderId: string;
    paymentNo?: string;
    amount: number;
    reason: string;
    requestedBy?: string;
  }): Promise<RefundRecord> {
    return this.db.refund.create({
      data: {
        refundNo: input.refundNo,
        orderId: input.orderId,
        paymentNo: input.paymentNo,
        amount: input.amount,
        reason: input.reason,
        requestedBy: input.requestedBy,
        status: 'pending'
      }
    });
  }

  findRefundById(refundId: string): Promise<RefundRecord | null> {
    return this.db.refund.findUnique({ where: { id: refundId } });
  }

  approveRefund(refundId: string, approvedBy: string, remark?: string): Promise<RefundRecord> {
    return this.db.refund.update({
      where: { id: refundId },
      data: {
        status: 'approved',
        approvedBy,
        approvalRemark: remark
      }
    });
  }

  updateRefundExecution(input: {
    refundId: string;
    status: 'processing' | 'succeeded' | 'failed';
    providerRefundId?: string;
    rawResponse?: Record<string, unknown>;
  }): Promise<RefundRecord> {
    return this.db.refund.update({
      where: { id: input.refundId },
      data: {
        status: input.status,
        providerRefundId: input.providerRefundId,
        rawResponse: input.rawResponse || {},
        succeededAt: input.status === 'succeeded' ? new Date() : undefined
      }
    });
  }

  async incrementOrderRefundedAmount(orderId: string, amount: number): Promise<void> {
    await this.db.order.update({
      where: { id: orderId },
      data: {
        refundedAmount: { increment: amount }
      }
    });
  }
}
