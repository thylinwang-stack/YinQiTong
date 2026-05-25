import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessException } from '@/common/errors/business.exception';
import { AUDITED_ORDER_TRANSITIONS } from './constants/order-status-transitions';
import {
  CancelOrderDto,
  DepositPaidCallbackDto,
  RefundOrderDto,
  TransitionOrderStatusDto
} from './dto/transition-order-status.dto';
import {
  OrderStatus,
  OrderTransitionActorType,
  OrderTransitionTrigger,
  PAID_OR_AFTER_STATUSES
} from './enums/order-status.enum';
import { OrderStateMachineService } from './order-state-machine.service';
import {
  ORDER_STATUS_REPOSITORY,
  OrderStatusRecord,
  OrderStatusRepository
} from './repositories/order-status.repository';

export interface TransitionResult {
  order: OrderStatusRecord;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  ignored?: boolean;
}

@Injectable()
export class OrderStatusService {
  constructor(
    private readonly stateMachine: OrderStateMachineService,
    @Inject(ORDER_STATUS_REPOSITORY)
    private readonly repository: OrderStatusRepository
  ) {}

  transition(orderId: string, dto: TransitionOrderStatusDto): Promise<TransitionResult> {
    return this.repository.transaction(async repo => {
      const order = await this.findOrderOrThrow(repo, orderId);
      return this.applyTransition(repo, order, dto);
    });
  }

  markException(orderId: string, actorId: string, reason?: string): Promise<TransitionResult> {
    return this.transition(orderId, {
      toStatus: OrderStatus.Exception,
      trigger: OrderTransitionTrigger.AdminException,
      actorType: OrderTransitionActorType.Admin,
      actorId,
      reason
    });
  }

  cancelOrder(orderId: string, dto: CancelOrderDto): Promise<TransitionResult> {
    return this.repository.transaction(async repo => {
      const order = await this.findOrderOrThrow(repo, orderId);
      const refundRequired = PAID_OR_AFTER_STATUSES.has(order.status);
      return this.applyTransition(repo, order, {
        toStatus: OrderStatus.Cancelled,
        trigger: dto.actorType === OrderTransitionActorType.Customer
          ? OrderTransitionTrigger.CustomerCancel
          : OrderTransitionTrigger.AdminCancel,
        actorId: dto.actorId,
        actorType: dto.actorType,
        reason: dto.reason,
        metadata: { refundRequired }
      });
    });
  }

  refundOrder(orderId: string, dto: RefundOrderDto): Promise<TransitionResult> {
    return this.repository.transaction(async repo => {
      const order = await this.findOrderOrThrow(repo, orderId);
      if (![OrderStatus.Cancelled, OrderStatus.Exception].includes(order.status)) {
        throw new BusinessException(
          'ORDER_REFUND_STATE_INVALID',
          '只有 cancelled 或 exception 状态的订单可以进入 refunded',
          undefined,
          { currentStatus: order.status }
        );
      }

      await repo.markRefundSucceeded({
        orderId,
        refundNo: dto.refundNo,
        paymentNo: dto.paymentNo
      });

      return this.applyTransition(repo, order, {
        toStatus: OrderStatus.Refunded,
        trigger: OrderTransitionTrigger.RefundSucceeded,
        actorId: dto.actorId,
        actorType: OrderTransitionActorType.Admin,
        reason: dto.reason,
        metadata: { refundNo: dto.refundNo, paymentNo: dto.paymentNo }
      });
    });
  }

  handleDepositPaidCallback(dto: DepositPaidCallbackDto): Promise<TransitionResult> {
    return this.repository.transaction(async repo => {
      const existing = await repo.findPaymentCallback(dto.provider, dto.eventId);
      if (existing?.processed) {
        const order = await this.findOrderOrThrow(repo, dto.orderId);
        return {
          order,
          fromStatus: order.status,
          toStatus: order.status,
          ignored: true
        };
      }

      if (!existing) {
        await repo.createPaymentCallback({
          provider: dto.provider,
          eventId: dto.eventId,
          orderId: dto.orderId,
          paymentNo: dto.paymentNo,
          providerTransactionId: dto.providerTransactionId,
          rawPayload: dto.rawPayload
        });
      }

      const order = await this.findOrderOrThrow(repo, dto.orderId);
      await repo.markPaymentPaid({
        orderId: dto.orderId,
        paymentNo: dto.paymentNo,
        providerTransactionId: dto.providerTransactionId
      });

      if (order.status !== OrderStatus.DepositPending) {
        if (PAID_OR_AFTER_STATUSES.has(order.status)) {
          await repo.markPaymentCallbackProcessed(dto.provider, dto.eventId);
          await repo.createAuditLog({
            actorType: OrderTransitionActorType.PaymentProvider,
            action: 'payment.deposit_callback_ignored',
            resourceType: 'payment_callback',
            resourceId: dto.eventId,
            metadata: {
              orderId: dto.orderId,
              currentStatus: order.status,
              reason: 'order_already_paid_or_after'
            }
          });
          return {
            order,
            fromStatus: order.status,
            toStatus: order.status,
            ignored: true
          };
        }

        throw new BusinessException(
          'ORDER_PAYMENT_CALLBACK_STATE_INVALID',
          '支付回调只能把 deposit_pending 更新为 deposit_paid',
          undefined,
          { currentStatus: order.status }
        );
      }

      const result = await this.applyTransition(repo, order, {
        toStatus: OrderStatus.DepositPaid,
        trigger: OrderTransitionTrigger.PaymentCallback,
        actorType: OrderTransitionActorType.PaymentProvider,
        reason: 'deposit payment callback verified',
        metadata: {
          provider: dto.provider,
          eventId: dto.eventId,
          paymentNo: dto.paymentNo,
          providerTransactionId: dto.providerTransactionId
        }
      });

      await repo.markPaymentCallbackProcessed(dto.provider, dto.eventId);
      return result;
    });
  }

  async completeService(orderId: string, actorId: string, autoStartSettlement = true): Promise<TransitionResult> {
    return this.repository.transaction(async repo => {
      const order = await this.findOrderOrThrow(repo, orderId);
      const completed = await this.applyTransition(repo, order, {
        toStatus: OrderStatus.Completed,
        trigger: OrderTransitionTrigger.ServiceCompleted,
        actorType: OrderTransitionActorType.Admin,
        actorId,
        reason: 'service completed'
      });

      if (!autoStartSettlement) {
        return completed;
      }

      return this.applyTransition(repo, completed.order, {
        toStatus: OrderStatus.SettlementPending,
        trigger: OrderTransitionTrigger.SettlementStarted,
        actorType: OrderTransitionActorType.Admin,
        actorId,
        reason: 'auto start settlement after service completion'
      });
    });
  }

  private async findOrderOrThrow(repo: OrderStatusRepository, orderId: string): Promise<OrderStatusRecord> {
    const order = await repo.findOrderById(orderId);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    return order;
  }

  private async applyTransition(
    repo: OrderStatusRepository,
    order: OrderStatusRecord,
    dto: TransitionOrderStatusDto
  ): Promise<TransitionResult> {
    if (order.status === dto.toStatus) {
      return {
        order,
        fromStatus: order.status,
        toStatus: dto.toStatus,
        ignored: true
      };
    }

    this.stateMachine.assertTransition({
      fromStatus: order.status,
      toStatus: dto.toStatus,
      trigger: dto.trigger,
      actorType: dto.actorType
    });

    const updated = await repo.updateOrderStatus(order.id, dto.toStatus);
    await repo.createStatusLog({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: dto.toStatus,
      trigger: dto.trigger,
      actorId: dto.actorId,
      actorType: dto.actorType,
      reason: dto.reason,
      metadata: dto.metadata
    });

    if (AUDITED_ORDER_TRANSITIONS.has(dto.toStatus)) {
      await repo.createAuditLog({
        actorId: dto.actorId,
        actorType: dto.actorType,
        action: `order.status.${order.status}_to_${dto.toStatus}`,
        resourceType: 'order',
        resourceId: order.id,
        beforeData: { status: order.status },
        afterData: { status: dto.toStatus },
        metadata: {
          trigger: dto.trigger,
          reason: dto.reason,
          ...(dto.metadata || {})
        }
      });
    }

    return {
      order: updated,
      fromStatus: order.status,
      toStatus: dto.toStatus
    };
  }
}
