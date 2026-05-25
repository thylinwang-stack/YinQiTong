import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OrderStatus } from '../enums/order-status.enum';
import {
  CreateAuditLogInput,
  CreatePaymentCallbackInput,
  CreateStatusLogInput,
  OrderStatusRecord,
  OrderStatusRepository,
  PaymentCallbackRecord
} from './order-status.repository';

type PrismaLike = PrismaService & {
  [key: string]: any;
};

@Injectable()
export class PrismaOrderStatusRepository implements OrderStatusRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaLike) {}

  async transaction<T>(handler: (repo: OrderStatusRepository) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => handler(new PrismaOrderStatusRepository(tx as PrismaLike)));
  }

  async findOrderById(orderId: string): Promise<OrderStatusRecord | null> {
    return this.db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNo: true,
        status: true,
        paidAmount: true,
        refundedAmount: true
      }
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderStatusRecord> {
    return this.db.order.update({
      where: { id: orderId },
      data: { status },
      select: {
        id: true,
        orderNo: true,
        status: true,
        paidAmount: true,
        refundedAmount: true
      }
    });
  }

  async createStatusLog(input: CreateStatusLogInput): Promise<void> {
    await this.db.orderStatusLog.create({
      data: {
        orderId: input.orderId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        trigger: input.trigger,
        actorId: input.actorId,
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

  async findPaymentCallback(provider: string, eventId: string): Promise<PaymentCallbackRecord | null> {
    return this.db.paymentCallback.findUnique({
      where: {
        provider_eventId: { provider, eventId }
      },
      select: {
        id: true,
        provider: true,
        eventId: true,
        processed: true
      }
    });
  }

  async createPaymentCallback(input: CreatePaymentCallbackInput): Promise<PaymentCallbackRecord> {
    return this.db.paymentCallback.create({
      data: {
        provider: input.provider,
        eventId: input.eventId,
        orderId: input.orderId,
        paymentNo: input.paymentNo,
        providerTransactionId: input.providerTransactionId,
        rawPayload: input.rawPayload,
        processed: false
      },
      select: {
        id: true,
        provider: true,
        eventId: true,
        processed: true
      }
    });
  }

  async markPaymentCallbackProcessed(provider: string, eventId: string): Promise<void> {
    await this.db.paymentCallback.update({
      where: {
        provider_eventId: { provider, eventId }
      },
      data: {
        processed: true,
        processedAt: new Date()
      }
    });
  }

  async markPaymentPaid(input: {
    orderId: string;
    paymentNo?: string;
    providerTransactionId?: string;
  }): Promise<void> {
    await this.db.payment.updateMany({
      where: {
        orderId: input.orderId,
        ...(input.paymentNo ? { paymentNo: input.paymentNo } : {})
      },
      data: {
        status: 'paid',
        providerTransactionId: input.providerTransactionId,
        paidAt: new Date()
      }
    });
  }

  async markRefundSucceeded(input: {
    orderId: string;
    refundNo: string;
    paymentNo?: string;
  }): Promise<void> {
    await this.db.refund.updateMany({
      where: {
        orderId: input.orderId,
        refundNo: input.refundNo
      },
      data: {
        status: 'succeeded',
        succeededAt: new Date()
      }
    });
  }
}
