export type PaymentProviderName = 'mock' | 'wechat_pay';

export interface WxRequestPaymentParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'MD5' | 'HMAC-SHA256' | 'RSA';
  paySign: string;
}

export interface CreatePrepayInput {
  paymentNo: string;
  orderNo: string;
  amount: number;
  description: string;
  payerOpenid?: string;
  notifyUrl: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePrepayResult {
  provider: PaymentProviderName;
  providerPrepayId: string;
  requestPaymentParams: WxRequestPaymentParams;
  rawResponse: Record<string, unknown>;
}

export interface PaymentNotifyEvent {
  eventId: string;
  paymentNo: string;
  providerTransactionId: string;
  tradeState: 'SUCCESS' | 'CLOSED' | 'FAILED' | 'UNKNOWN';
  amount: number;
  paidAt?: Date;
  rawPayload: Record<string, unknown>;
}

export interface RefundInput {
  refundNo: string;
  paymentNo: string;
  providerTransactionId?: string;
  amount: number;
  totalAmount: number;
  reason: string;
  notifyUrl: string;
}

export interface RefundResult {
  providerRefundId: string;
  status: 'processing' | 'succeeded' | 'failed';
  rawResponse: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createPrepay(input: CreatePrepayInput): Promise<CreatePrepayResult>;
  verifyNotify(rawBody: Buffer | string, headers: Record<string, string | string[] | undefined>): Promise<PaymentNotifyEvent>;
  refund(input: RefundInput): Promise<RefundResult>;
}

export const PAYMENT_PROVIDER_REGISTRY = Symbol('PAYMENT_PROVIDER_REGISTRY');
