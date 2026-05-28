import {
  OrderStatus,
  OrderTransitionActorType,
  OrderTransitionTrigger
} from '../enums/order-status.enum';

export interface OrderStatusRecord {
  id: string;
  status: OrderStatus;
  orderNo?: string | null;
  paidAmount?: number | string | null;
  refundedAmount?: number | string | null;
}

export interface PaymentCallbackRecord {
  id: string;
  provider: string;
  eventId: string;
  processed: boolean;
}

export interface CreateStatusLogInput {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  trigger: OrderTransitionTrigger;
  actorId?: string;
  actorType: OrderTransitionActorType;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAuditLogInput {
  actorId?: string;
  actorType: OrderTransitionActorType;
  action: string;
  resourceType: 'order' | 'payment_callback';
  resourceId: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentCallbackInput {
  provider: string;
  eventId: string;
  orderId: string;
  paymentNo?: string;
  providerTransactionId?: string;
  rawPayload: Record<string, unknown>;
}

export const ORDER_STATUS_REPOSITORY = Symbol('ORDER_STATUS_REPOSITORY');

export interface OrderStatusRepository {
  transaction<T>(handler: (repo: OrderStatusRepository) => Promise<T>): Promise<T>;
  findOrderById(orderId: string): Promise<OrderStatusRecord | null>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderStatusRecord>;
  createStatusLog(input: CreateStatusLogInput): Promise<void>;
  createAuditLog(input: CreateAuditLogInput): Promise<void>;
  findPaymentCallback(provider: string, eventId: string): Promise<PaymentCallbackRecord | null>;
  createPaymentCallback(input: CreatePaymentCallbackInput): Promise<PaymentCallbackRecord>;
  markPaymentCallbackProcessed(provider: string, eventId: string): Promise<void>;
  markPaymentPaid(input: {
    orderId: string;
    paymentNo?: string;
    providerTransactionId?: string;
  }): Promise<void>;
  markRefundSucceeded(input: {
    orderId: string;
    refundNo: string;
    paymentNo?: string;
  }): Promise<void>;
}
