import { OrderStatus, OrderTransitionTrigger } from '../enums/order-status.enum';

export const LEGAL_ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.Draft]: [OrderStatus.Submitted, OrderStatus.Cancelled],
  [OrderStatus.Submitted]: [OrderStatus.Consulting, OrderStatus.Cancelled, OrderStatus.Exception],
  [OrderStatus.Consulting]: [OrderStatus.Quoted, OrderStatus.Cancelled, OrderStatus.Exception],
  [OrderStatus.Quoted]: [OrderStatus.DepositPending, OrderStatus.Cancelled, OrderStatus.Exception],
  [OrderStatus.DepositPending]: [OrderStatus.DepositPaid, OrderStatus.Cancelled, OrderStatus.Exception],
  [OrderStatus.DepositPaid]: [OrderStatus.Matching, OrderStatus.Cancelled, OrderStatus.Exception],
  [OrderStatus.Matching]: [OrderStatus.Confirmed, OrderStatus.Cancelled, OrderStatus.Exception],
  [OrderStatus.Confirmed]: [OrderStatus.Prep, OrderStatus.Cancelled, OrderStatus.Exception],
  [OrderStatus.Prep]: [OrderStatus.Executing, OrderStatus.Cancelled, OrderStatus.Exception],
  [OrderStatus.Executing]: [OrderStatus.Completed, OrderStatus.Exception],
  [OrderStatus.Completed]: [OrderStatus.Reviewed, OrderStatus.SettlementPending, OrderStatus.Exception],
  [OrderStatus.Reviewed]: [OrderStatus.SettlementPending, OrderStatus.Exception],
  [OrderStatus.SettlementPending]: [OrderStatus.Settled, OrderStatus.Exception],
  [OrderStatus.Settled]: [],
  [OrderStatus.Cancelled]: [OrderStatus.Refunded],
  [OrderStatus.Refunded]: [],
  [OrderStatus.Exception]: [OrderStatus.Cancelled, OrderStatus.Refunded]
};

export const REQUIRED_TRIGGER_BY_TARGET: Partial<Record<OrderStatus, OrderTransitionTrigger[]>> = {
  [OrderStatus.DepositPaid]: [OrderTransitionTrigger.PaymentCallback],
  [OrderStatus.Refunded]: [OrderTransitionTrigger.RefundSucceeded],
  [OrderStatus.Exception]: [OrderTransitionTrigger.AdminException]
};

export const AUDITED_ORDER_TRANSITIONS = new Set<OrderStatus>(Object.values(OrderStatus));
