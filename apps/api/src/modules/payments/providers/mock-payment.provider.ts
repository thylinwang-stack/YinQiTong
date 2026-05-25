import { Injectable } from '@nestjs/common';
import {
  CreatePrepayInput,
  CreatePrepayResult,
  PaymentNotifyEvent,
  PaymentProvider,
  RefundInput,
  RefundResult
} from './payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;

  async createPrepay(input: CreatePrepayInput): Promise<CreatePrepayResult> {
    const providerPrepayId = `mock_prepay_${input.paymentNo}`;
    return {
      provider: this.name,
      providerPrepayId,
      requestPaymentParams: {
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: `mock_${Date.now()}`,
        package: `prepay_id=${providerPrepayId}`,
        signType: 'RSA',
        paySign: `mock_pay_sign_${input.paymentNo}`
      },
      rawResponse: {
        providerPrepayId,
        paymentNo: input.paymentNo,
        amount: input.amount,
        description: input.description
      }
    };
  }

  async verifyNotify(rawBody: Buffer | string): Promise<PaymentNotifyEvent> {
    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const payload = JSON.parse(text || '{}') as Record<string, any>;

    return {
      eventId: String(payload.eventId || payload.id || `mock_evt_${payload.paymentNo}`),
      paymentNo: String(payload.paymentNo || payload.out_trade_no),
      providerTransactionId: String(payload.providerTransactionId || payload.transaction_id || `mock_tx_${payload.paymentNo}`),
      tradeState: payload.tradeState || payload.trade_state || 'SUCCESS',
      amount: Number(payload.amount?.payer_total ?? payload.amount ?? 0),
      paidAt: payload.paidAt ? new Date(payload.paidAt) : new Date(),
      rawPayload: payload
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      providerRefundId: `mock_refund_${input.refundNo}`,
      status: 'succeeded',
      rawResponse: {
        refundNo: input.refundNo,
        paymentNo: input.paymentNo,
        amount: input.amount,
        reason: input.reason
      }
    };
  }
}
