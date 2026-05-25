import { BusinessException } from '@/common/errors/business.exception';
import {
  OrderStatus,
  OrderTransitionActorType,
  OrderTransitionTrigger
} from '../enums/order-status.enum';
import { OrderStateMachineService } from '../order-state-machine.service';

describe('OrderStateMachineService', () => {
  let service: OrderStateMachineService;

  beforeEach(() => {
    service = new OrderStateMachineService();
  });

  it('allows the normal early order flow', () => {
    expect(service.canTransition({
      fromStatus: OrderStatus.Draft,
      toStatus: OrderStatus.Submitted,
      trigger: OrderTransitionTrigger.CustomerSubmit,
      actorType: OrderTransitionActorType.Customer
    })).toBe(true);

    expect(service.canTransition({
      fromStatus: OrderStatus.Submitted,
      toStatus: OrderStatus.Consulting,
      trigger: OrderTransitionTrigger.ManagerConsult,
      actorType: OrderTransitionActorType.Admin
    })).toBe(true);
  });

  it('rejects illegal jumps', () => {
    expect(() => service.assertTransition({
      fromStatus: OrderStatus.Draft,
      toStatus: OrderStatus.DepositPaid,
      trigger: OrderTransitionTrigger.AdminOverride,
      actorType: OrderTransitionActorType.Admin
    })).toThrow(BusinessException);
  });

  it('requires payment callback for deposit_paid', () => {
    expect(() => service.assertTransition({
      fromStatus: OrderStatus.DepositPending,
      toStatus: OrderStatus.DepositPaid,
      trigger: OrderTransitionTrigger.AdminOverride,
      actorType: OrderTransitionActorType.Admin
    })).toThrow(BusinessException);

    expect(() => service.assertTransition({
      fromStatus: OrderStatus.DepositPending,
      toStatus: OrderStatus.DepositPaid,
      trigger: OrderTransitionTrigger.PaymentCallback,
      actorType: OrderTransitionActorType.PaymentProvider
    })).not.toThrow();
  });

  it('only allows admins to mark exception', () => {
    expect(() => service.assertTransition({
      fromStatus: OrderStatus.Matching,
      toStatus: OrderStatus.Exception,
      trigger: OrderTransitionTrigger.AdminException,
      actorType: OrderTransitionActorType.Customer
    })).toThrow(BusinessException);

    expect(() => service.assertTransition({
      fromStatus: OrderStatus.Matching,
      toStatus: OrderStatus.Exception,
      trigger: OrderTransitionTrigger.AdminException,
      actorType: OrderTransitionActorType.Admin
    })).not.toThrow();
  });

  it('does not allow transitions out of terminal statuses', () => {
    expect(() => service.assertTransition({
      fromStatus: OrderStatus.Settled,
      toStatus: OrderStatus.Exception,
      trigger: OrderTransitionTrigger.AdminException,
      actorType: OrderTransitionActorType.Admin
    })).toThrow(BusinessException);
  });
});
