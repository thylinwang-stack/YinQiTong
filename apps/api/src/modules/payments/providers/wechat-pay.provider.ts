import { Injectable } from '@nestjs/common';
import { createDecipheriv, createSign, createVerify, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
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
  private readonly apiBaseUrl = process.env.WECHAT_PAY_API_BASE_URL || 'https://api.mch.weixin.qq.com';
  private readonly platformPublicKey = process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY;
  private readonly platformPublicKeyPath = process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH;
  private readonly notifyVerifyEnabled = process.env.WECHAT_PAY_NOTIFY_VERIFY !== 'false';

  async createPrepay(input: CreatePrepayInput): Promise<CreatePrepayResult> {
    this.assertConfigured(['WECHAT_PAY_APPID', 'WECHAT_PAY_MCHID', 'WECHAT_PAY_API_V3_KEY', 'WECHAT_PAY_PRIVATE_KEY', 'WECHAT_PAY_SERIAL_NO']);
    if (!input.payerOpenid) {
      throw new BusinessException('WECHAT_PAY_OPENID_REQUIRED', '微信支付需要当前用户 openid');
    }

    const path = '/v3/pay/transactions/jsapi';
    const body = JSON.stringify({
      appid: this.appid,
      mchid: this.mchid,
      description: this.normalizeDescription(input.description),
      out_trade_no: input.paymentNo,
      notify_url: input.notifyUrl,
      amount: {
        total: this.yuanToFen(input.amount),
        currency: 'CNY'
      },
      payer: {
        openid: input.payerOpenid
      }
    });
    const response = await this.requestWechatPay<{ prepay_id?: string }>('POST', path, body);
    const providerPrepayId = response.prepay_id;
    if (!providerPrepayId) {
      throw new BusinessException('WECHAT_PAY_PREPAY_ID_MISSING', '微信支付下单未返回 prepay_id');
    }
    const paymentPackage = `prepay_id=${providerPrepayId}`;
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.createNonce();
    return {
      provider: this.name,
      providerPrepayId,
      requestPaymentParams: {
        timeStamp,
        nonceStr,
        package: paymentPackage,
        signType: 'RSA',
        paySign: this.signMessage(`${this.appid}\n${timeStamp}\n${nonceStr}\n${paymentPackage}\n`)
      },
      rawResponse: {
        appid: this.appid,
        mchid: this.mchid,
        paymentNo: input.paymentNo,
        amount: input.amount,
        notifyUrl: input.notifyUrl,
        providerPrepayId,
        raw: response
      }
    };
  }

  async verifyNotify(rawBody: Buffer | string, headers: Record<string, string | string[] | undefined>): Promise<PaymentNotifyEvent> {
    this.assertConfigured(['WECHAT_PAY_API_V3_KEY']);

    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    if (this.notifyVerifyEnabled) {
      this.verifyNotifySignature(text, headers);
    }

    const payload = JSON.parse(text || '{}') as Record<string, any>;
    const resource = payload.resource || {};
    const plain = resource.ciphertext ? this.decryptResource(resource) : (payload.plain || payload.decrypted || resource.plain || payload);
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
    this.assertConfigured(['WECHAT_PAY_MCHID', 'WECHAT_PAY_API_V3_KEY', 'WECHAT_PAY_PRIVATE_KEY', 'WECHAT_PAY_SERIAL_NO']);

    const transactionSelector = input.providerTransactionId
      ? { transaction_id: input.providerTransactionId }
      : { out_trade_no: input.paymentNo };
    const body = JSON.stringify({
      ...transactionSelector,
      out_refund_no: input.refundNo,
      reason: input.reason,
      notify_url: input.notifyUrl,
      amount: {
        refund: this.yuanToFen(input.amount),
        total: this.yuanToFen(input.totalAmount),
        currency: 'CNY'
      }
    });
    const response = await this.requestWechatPay<{ refund_id?: string; status?: string }>('POST', '/v3/refund/domestic/refunds', body);
    return {
      providerRefundId: response.refund_id || input.refundNo,
      status: this.mapRefundStatus(response.status),
      rawResponse: {
        mchid: this.mchid,
        refundNo: input.refundNo,
        paymentNo: input.paymentNo,
        amount: input.amount,
        totalAmount: input.totalAmount,
        raw: response
      }
    };
  }

  private async requestWechatPay<T>(method: 'POST', path: string, body: string): Promise<T> {
    const authorization = this.createAuthorization(method, path, body);
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authorization,
        'User-Agent': 'YougeFanju/1.0'
      },
      body
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new BusinessException(
        'WECHAT_PAY_API_ERROR',
        payload?.message || payload?.code || '微信支付接口请求失败',
        response.status,
        { status: response.status, code: payload?.code }
      );
    }
    return payload as T;
  }

  private createAuthorization(method: string, path: string, body: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.createNonce();
    const signature = this.signMessage(`${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`);
    return [
      'WECHATPAY2-SHA256-RSA2048',
      `mchid="${this.mchid}"`,
      `nonce_str="${nonce}"`,
      `signature="${signature}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${this.serialNo}"`
    ].join(' ');
  }

  private verifyNotifySignature(rawBody: string, headers: Record<string, string | string[] | undefined>) {
    const signature = this.header(headers, 'wechatpay-signature');
    const nonce = this.header(headers, 'wechatpay-nonce');
    const timestamp = this.header(headers, 'wechatpay-timestamp');
    const serial = this.header(headers, 'wechatpay-serial');
    if (!signature || !nonce || !timestamp || !serial) {
      throw new BusinessException('WECHAT_PAY_SIGNATURE_MISSING', '微信支付回调缺少签名头');
    }
    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (!Number.isFinite(age) || age > 300) {
      throw new BusinessException('WECHAT_PAY_NOTIFY_EXPIRED', '微信支付回调时间戳超出允许范围');
    }
    const publicKey = this.getPlatformPublicKey();
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${timestamp}\n${nonce}\n${rawBody}\n`);
    verifier.end();
    const ok = verifier.verify(publicKey, signature, 'base64');
    if (!ok) {
      throw new BusinessException('WECHAT_PAY_SIGNATURE_INVALID', '微信支付回调签名验证失败');
    }
  }

  private decryptResource(resource: { ciphertext?: string; nonce?: string; associated_data?: string }) {
    if (!resource.ciphertext || !resource.nonce) {
      throw new BusinessException('WECHAT_PAY_NOTIFY_RESOURCE_INVALID', '微信支付回调资源字段不完整');
    }
    const key = Buffer.from(String(this.apiV3Key || ''), 'utf8');
    if (key.length !== 32) {
      throw new BusinessException('WECHAT_PAY_API_V3_KEY_INVALID', '微信支付 API v3 Key 必须为 32 字节');
    }
    const ciphertext = Buffer.from(resource.ciphertext, 'base64');
    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(resource.nonce, 'utf8'));
    if (resource.associated_data) {
      decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
    }
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    return JSON.parse(plain);
  }

  private getPlatformPublicKey() {
    const value = this.platformPublicKey || (this.platformPublicKeyPath ? readFileSync(this.platformPublicKeyPath, 'utf8') : '');
    if (!value) {
      throw new BusinessException(
        'WECHAT_PAY_PLATFORM_KEY_MISSING',
        '缺少微信支付平台公钥配置：WECHAT_PAY_PLATFORM_PUBLIC_KEY 或 WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH'
      );
    }
    return this.normalizePrivateOrPublicKey(value);
  }

  private signMessage(message: string) {
    const signer = createSign('RSA-SHA256');
    signer.update(message);
    signer.end();
    return signer.sign(this.normalizePrivateOrPublicKey(this.privateKey || ''), 'base64');
  }

  private assertConfigured(required: string[]) {
    const values: Record<string, string | undefined> = {
      WECHAT_PAY_APPID: this.appid,
      WECHAT_PAY_MCHID: this.mchid,
      WECHAT_PAY_API_V3_KEY: this.apiV3Key,
      WECHAT_PAY_PRIVATE_KEY: this.privateKey,
      WECHAT_PAY_SERIAL_NO: this.serialNo
    };
    const missing = required.filter(key => !values[key]);

    if (missing.length > 0) {
      throw new BusinessException(
        'WECHAT_PAY_CONFIG_MISSING',
        `微信支付配置缺失：${missing.join(', ')}`
      );
    }
  }

  private normalizePrivateOrPublicKey(value: string) {
    return value.replace(/\\n/g, '\n').trim();
  }

  private normalizeDescription(value: string) {
    const normalized = value.trim() || '商务接待氛围服务预约金';
    return normalized.length > 127 ? normalized.slice(0, 127) : normalized;
  }

  private yuanToFen(amount: number) {
    return Math.round(Number(amount) * 100);
  }

  private createNonce() {
    return randomBytes(16).toString('hex');
  }

  private header(headers: Record<string, string | string[] | undefined>, name: string) {
    const key = Object.keys(headers).find(item => item.toLowerCase() === name.toLowerCase());
    const value = key ? headers[key] : undefined;
    return Array.isArray(value) ? value[0] : value;
  }

  private mapRefundStatus(status?: string): RefundResult['status'] {
    if (status === 'SUCCESS') return 'succeeded';
    if (status === 'CLOSED' || status === 'ABNORMAL') return 'failed';
    return 'processing';
  }
}
