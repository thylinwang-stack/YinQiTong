import { OrderStatus } from '@/modules/orders/enums/order-status.enum';
import { PaymentProviderName } from '../providers/payment-provider.interface';

export interface PaymentOrderRecord {
  id: string;
  orderNo: string;
  status: OrderStatus;
  totalAmount: number | string;
  depositAmount: number | string;
  paidAmount: number | string;
  refundedAmount: number | string;
  customerUserId?: string | null;
}

export interface PaymentRecord {
  id: string;
  paymentNo: string;
  orderId: string;
  provider: PaymentProviderName;
  subject: string;
  amount: number | string;
  status: 'pending' | 'paid' | 'failed' | 'closed' | 'refunded';
  providerTransactionId?: string | null;
}

export interface RefundRecord {
  id: string;
  refundNo: string;
  orderId: string;
  paymentNo?: string | null;
  amount: number | string;
  status: 'pending' | 'approved' | 'processing' | 'succeeded' | 'failed' | 'rejected';
  reason?: string | null;
}

export interface PaymentCallbackLogRecord {
  id: string;
  provider: PaymentProviderName;
  eventId: string;
  processed: boolean;
}

export interface CreatePaymentRecordInput {
  paymentNo: string;
  orderId: string;
  provider: PaymentProviderName;
  subject: string;
  amount: number;
  currency: string;
  providerPrepayId?: string;
  rawPrepayResponse?: Record<string, unknown>;
}

export interface CreatePaymentCallbackLogInput {
  provider: PaymentProviderName;
  eventId: string;
  paymentNo?: string;
  providerTransactionId?: string;
  rawBody: Record<string, unknown>;
  headers: Record<string, unknown>;
}

export interface CreateOrderStatusLogInput {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  trigger: string;
  actorType: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAuditLogInput {
  actorId?: string;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface PaymentRepository {
  transaction<T>(handler: (repo: PaymentRepository) => Promise<T>): Promise<T>;
  findOrderById(orderId: string): Promise<PaymentOrderRecord | null>;
  findPaymentByNo(paymentNo: string): Promise<PaymentRecord | null>;
  findLatestPaidPaymentByOrder(orderId: string): Promise<PaymentRecord | null>;
  createPayment(input: CreatePaymentRecordInput): Promise<PaymentRecord>;
  attachPrepayResult(paymentNo: string, providerPrepayId: string, rawResponse: Record<string, unknown>): Promise<void>;
  markPaymentPaid(input: { paymentNo: string; providerTransactionId: string; paidAt?: Date }): Promise<PaymentRecord>;
  incrementOrderPaidAmount(orderId: string, amount: number): Promise<void>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<PaymentOrderRecord>;
  createOrderStatusLog(input: CreateOrderStatusLogInput): Promise<void>;
  createAuditLog(input: CreateAuditLogInput): Promise<void>;
  findPaymentCallbackLog(provider: PaymentProviderName, eventId: string): Promise<PaymentCallbackLogRecord | null>;
  createPaymentCallbackLog(input: CreatePaymentCallbackLogInput): Promise<PaymentCallbackLogRecord>;
  markPaymentCallbackLogProcessed(provider: PaymentProviderName, eventId: string): Promise<void>;
  createRefund(input: {
    refundNo: string;
    orderId: string;
    paymentNo?: string;
    amount: number;
    reason: string;
    requestedBy?: string;
  }): Promise<RefundRecord>;
  findRefundById(refundId: string): Promise<RefundRecord | null>;
  approveRefund(refundId: string, approvedBy: string, remark?: string): Promise<RefundRecord>;
  updateRefundExecution(input: {
    refundId: string;
    status: 'processing' | 'succeeded' | 'failed';
    providerRefundId?: string;
    rawResponse?: Record<string, unknown>;
  }): Promise<RefundRecord>;
  incrementOrderRefundedAmount(orderId: string, amount: number): Promise<void>;
}
