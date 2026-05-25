import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/errors/business.exception';
import {
  LEGAL_ORDER_STATUS_TRANSITIONS,
  REQUIRED_TRIGGER_BY_TARGET
} from './constants/order-status-transitions';
import {
  OrderStatus,
  OrderTransitionActorType,
  OrderTransitionTrigger,
  TERMINAL_ORDER_STATUSES
} from './enums/order-status.enum';

export interface OrderTransitionContext {
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  trigger: OrderTransitionTrigger;
  actorType: OrderTransitionActorType;
}

@Injectable()
export class OrderStateMachineService {
  getAllowedTargets(fromStatus: OrderStatus): readonly OrderStatus[] {
    return LEGAL_ORDER_STATUS_TRANSITIONS[fromStatus] || [];
  }

  canTransition(context: OrderTransitionContext): boolean {
    return this.validateTransition(context, false);
  }

  assertTransition(context: OrderTransitionContext): void {
    this.validateTransition(context, true);
  }

  private validateTransition(context: OrderTransitionContext, shouldThrow: boolean): boolean {
    const { fromStatus, toStatus, trigger, actorType } = context;

    if (fromStatus === toStatus) {
      return true;
    }

    if (TERMINAL_ORDER_STATUSES.has(fromStatus)) {
      return this.reject(
        shouldThrow,
        'ORDER_STATUS_TERMINAL',
        `订单当前状态 ${fromStatus} 为终态，不能流转到 ${toStatus}`,
        context
      );
    }

    const allowedTargets = this.getAllowedTargets(fromStatus);
    if (!allowedTargets.includes(toStatus)) {
      return this.reject(
        shouldThrow,
        'ORDER_STATUS_TRANSITION_INVALID',
        `非法订单状态流转：${fromStatus} -> ${toStatus}`,
        context
      );
    }

    const requiredTriggers = REQUIRED_TRIGGER_BY_TARGET[toStatus];
    if (requiredTriggers && !requiredTriggers.includes(trigger)) {
      return this.reject(
        shouldThrow,
        'ORDER_STATUS_TRIGGER_INVALID',
        `状态 ${toStatus} 必须由指定触发器触发：${requiredTriggers.join(', ')}`,
        context
      );
    }

    if (toStatus === OrderStatus.Exception && actorType !== OrderTransitionActorType.Admin) {
      return this.reject(
        shouldThrow,
        'ORDER_EXCEPTION_REQUIRES_ADMIN',
        '只有管理员可以手动标记订单为 exception',
        context
      );
    }

    if (toStatus === OrderStatus.DepositPaid && actorType !== OrderTransitionActorType.PaymentProvider) {
      return this.reject(
        shouldThrow,
        'ORDER_DEPOSIT_PAID_REQUIRES_CALLBACK',
        'deposit_paid 必须由支付回调触发',
        context
      );
    }

    return true;
  }

  private reject(
    shouldThrow: boolean,
    code: string,
    message: string,
    details: Record<string, unknown>
  ): false {
    if (shouldThrow) {
      throw new BusinessException(code, message, HttpStatus.CONFLICT, details);
    }
    return false;
  }
}
