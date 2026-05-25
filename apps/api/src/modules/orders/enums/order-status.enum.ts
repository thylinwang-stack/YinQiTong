export enum OrderStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Consulting = 'consulting',
  Quoted = 'quoted',
  DepositPending = 'deposit_pending',
  DepositPaid = 'deposit_paid',
  Matching = 'matching',
  Confirmed = 'confirmed',
  Prep = 'prep',
  Executing = 'executing',
  Completed = 'completed',
  Reviewed = 'reviewed',
  SettlementPending = 'settlement_pending',
  Settled = 'settled',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
  Exception = 'exception'
}

export enum OrderTransitionTrigger {
  CustomerSubmit = 'customer_submit',
  ManagerConsult = 'manager_consult',
  QuoteCreated = 'quote_created',
  DepositRequested = 'deposit_requested',
  PaymentCallback = 'payment_callback',
  MatchStarted = 'match_started',
  MatchConfirmed = 'match_confirmed',
  PrepStarted = 'prep_started',
  ServiceStarted = 'service_started',
  ServiceCompleted = 'service_completed',
  CustomerReviewed = 'customer_reviewed',
  SettlementStarted = 'settlement_started',
  SettlementPaid = 'settlement_paid',
  CustomerCancel = 'customer_cancel',
  AdminCancel = 'admin_cancel',
  RefundSucceeded = 'refund_succeeded',
  AdminException = 'admin_exception',
  AdminOverride = 'admin_override'
}

export enum OrderTransitionActorType {
  Customer = 'customer',
  Assistant = 'assistant',
  Admin = 'admin',
  System = 'system',
  PaymentProvider = 'payment_provider'
}

export const TERMINAL_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.Settled,
  OrderStatus.Refunded
]);

export const PAID_OR_AFTER_STATUSES = new Set<OrderStatus>([
  OrderStatus.DepositPaid,
  OrderStatus.Matching,
  OrderStatus.Confirmed,
  OrderStatus.Prep,
  OrderStatus.Executing,
  OrderStatus.Completed,
  OrderStatus.Reviewed,
  OrderStatus.SettlementPending,
  OrderStatus.Settled
]);
