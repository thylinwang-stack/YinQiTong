import { Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/errors/business.exception';
import {
  CreatePrepayInput,
  CreatePrepayResult,
  PaymentNotifyEvent,
  PaymentProvider,
  RefundInput,
  RefundResult
} from './payment-provider.interface';

@Injectable()
export class WeChatPayProvider implements PaymentProvider {
  readonly name = 'wechat_pay' as const;

  private readonly appid = process.env.WECHAT_PAY_APPID;
  private readonly mchid = process.env.WECHAT_PAY_MCHID;
  private readonly apiV3Key = process.env.WECHAT_PAY_API_V3_KEY;
  private readonly privateKey = process.env.WECHAT_PAY_PRIVATE_KEY;
  private readonly serialNo = process.env.WECHAT_PAY_SERIAL_NO;

  async createPrepay(input: CreatePrepayInput): Promise<CreatePrepayResult> {
    this.assertConfigured();

    // 占位实现：真实接入时在这里调用微信支付 JSAPI 下单接口，并使用商户私钥签名。
    // 所有密钥都从环境变量读取，不在代码中写死。
    const providerPrepayId = `wx_prepay_placeholder_${input.paymentNo}`;
    return {
      provider: this.name,
      providerPrepayId,
      requestPaymentParams: {
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: `wx_${Date.now()}`,
        package: `prepay_id=${providerPrepayId}`,
        signType: 'RSA',
        paySign: 'PLACEHOLDER_SIGN_FROM_WECHAT_PAY_PROVIDER'
      },
      rawResponse: {
        appid: this.appid,
        mchid: this.mchid,
        paymentNo: input.paymentNo,
        amount: input.amount,
        notifyUrl: input.notifyUrl,
        providerPrepayId
      }
    };
  }

  async verifyNotify(rawBody: Buffer | string, headers: Record<string, string | string[] | undefined>): Promise<PaymentNotifyEvent> {
    this.assertConfigured();

    // 验签占位：真实接入时校验 Wechatpay-Signature / Wechatpay-Nonce / Wechatpay-Timestamp / Wechatpay-Serial。
    // 同时需要使用 API v3 key 解密 resource.ciphertext。
    if (!headers['wechatpay-signature'] && !headers['Wechatpay-Signature']) {
      throw new BusinessException('WECHAT_PAY_SIGNATURE_MISSING', '微信支付回调缺少签名头');
    }

    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const payload = JSON.parse(text || '{}') as Record<string, any>;
    const resource = payload.resource || {};
    const plain = payload.plain || payload.decrypted || resource.plain || payload;
    const amount = plain.amount || {};

    return {
      eventId: String(payload.id || plain.transaction_id || plain.out_trade_no),
      paymentNo: String(plain.out_trade_no),
      providerTransactionId: String(plain.transaction_id),
      tradeState: plain.trade_state || 'UNKNOWN',
      amount: Number(amount.payer_total ?? amount.total ?? 0) / 100,
      paidAt: plain.success_time ? new Date(plain.success_time) : new Date(),
      rawPayload: payload
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    this.assertConfigured();

    // 占位实现：真实接入时调用微信支付退款接口，金额需以分为单位提交。
    return {
      providerRefundId: `wx_refund_placeholder_${input.refundNo}`,
      status: 'processing',
      rawResponse: {
        mchid: this.mchid,
        refundNo: input.refundNo,
        paymentNo: input.paymentNo,
        amount: input.amount,
        totalAmount: input.totalAmount
      }
    };
  }

  private assertConfigured() {
    const missing = [
      ['WECHAT_PAY_APPID', this.appid],
      ['WECHAT_PAY_MCHID', this.mchid],
      ['WECHAT_PAY_API_V3_KEY', this.apiV3Key],
      ['WECHAT_PAY_PRIVATE_KEY', this.privateKey],
      ['WECHAT_PAY_SERIAL_NO', this.serialNo]
    ].filter(([, value]) => !value);

    if (missing.length > 0) {
      throw new BusinessException(
        'WECHAT_PAY_CONFIG_MISSING',
        `微信支付配置缺失：${missing.map(([key]) => key).join(', ')}`
      );
    }
  }
}
