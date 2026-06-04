import { createCipheriv, createSign, generateKeyPairSync, randomBytes } from 'node:crypto';
import { WeChatPayProvider } from '../providers/wechat-pay.provider';

const OLD_ENV = process.env;

describe('WeChatPayProvider', () => {
  let merchantPrivateKey: string;
  let platformPrivateKey: string;
  let platformPublicKey: string;

  beforeEach(() => {
    const merchant = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const platform = generateKeyPairSync('rsa', { modulusLength: 2048 });
    merchantPrivateKey = merchant.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    platformPrivateKey = platform.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    platformPublicKey = platform.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    process.env = {
      ...OLD_ENV,
      WECHAT_PAY_APPID: 'wx_appid',
      WECHAT_PAY_MCHID: '1900000001',
      WECHAT_PAY_API_V3_KEY: '12345678901234567890123456789012',
      WECHAT_PAY_PRIVATE_KEY: merchantPrivateKey,
      WECHAT_PAY_SERIAL_NO: 'merchant_serial_no',
      WECHAT_PAY_PLATFORM_PUBLIC_KEY: platformPublicKey,
      WECHAT_PAY_API_BASE_URL: 'https://pay.example.test'
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = OLD_ENV;
  });

  it('calls JSAPI prepay API and returns signed requestPayment params', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ prepay_id: 'wx_prepay_001' })
    });
    global.fetch = fetchMock as any;

    const provider = new WeChatPayProvider();
    const result = await provider.createPrepay({
      paymentNo: 'PAY20260531001',
      orderNo: 'BS20260531001',
      amount: 800,
      description: '商务接待氛围服务预约金',
      payerOpenid: 'openid_001',
      notifyUrl: 'https://api.juclub.com.cn/payments/notify/wechat_pay'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://pay.example.test/v3/pay/transactions/jsapi',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('WECHATPAY2-SHA256-RSA2048')
        })
      })
    );
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toMatchObject({
      appid: 'wx_appid',
      mchid: '1900000001',
      out_trade_no: 'PAY20260531001',
      payer: { openid: 'openid_001' },
      amount: { total: 80000, currency: 'CNY' }
    });
    expect(result.providerPrepayId).toBe('wx_prepay_001');
    expect(result.requestPaymentParams).toMatchObject({
      package: 'prepay_id=wx_prepay_001',
      signType: 'RSA'
    });
    expect(result.requestPaymentParams.paySign).not.toContain('PLACEHOLDER');
  });

  it('verifies and decrypts payment notify payload', async () => {
    const provider = new WeChatPayProvider();
    const plain = {
      out_trade_no: 'PAY20260531001',
      transaction_id: '4200000000202605310001',
      trade_state: 'SUCCESS',
      success_time: '2026-05-31T12:00:00+08:00',
      amount: { payer_total: 80000, total: 80000 }
    };
    const resource = encryptResource(plain, process.env.WECHAT_PAY_API_V3_KEY || '');
    const payload = {
      id: 'evt_001',
      create_time: '2026-05-31T12:00:01+08:00',
      event_type: 'TRANSACTION.SUCCESS',
      resource_type: 'encrypt-resource',
      resource
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = 'notify_nonce_001';
    const signature = signNotify(`${timestamp}\n${nonce}\n${rawBody}\n`, platformPrivateKey);

    const event = await provider.verifyNotify(rawBody, {
      'wechatpay-signature': signature,
      'wechatpay-nonce': nonce,
      'wechatpay-timestamp': timestamp,
      'wechatpay-serial': 'platform_serial_no'
    });

    expect(event).toMatchObject({
      eventId: 'evt_001',
      paymentNo: 'PAY20260531001',
      providerTransactionId: '4200000000202605310001',
      tradeState: 'SUCCESS',
      amount: 800
    });
  });
});

function encryptResource(payload: Record<string, unknown>, apiV3Key: string) {
  const nonce = randomBytes(12).toString('base64url').slice(0, 12);
  const associatedData = 'transaction';
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), Buffer.from(nonce, 'utf8'));
  cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    algorithm: 'AEAD_AES_256_GCM',
    nonce,
    associated_data: associatedData,
    ciphertext: Buffer.concat([encrypted, authTag]).toString('base64')
  };
}

function signNotify(message: string, privateKey: string) {
  const signer = createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, 'base64');
}
