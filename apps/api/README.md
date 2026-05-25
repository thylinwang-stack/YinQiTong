# API 订单状态机模块

位置：`src/modules/orders`

## 状态

```txt
draft -> submitted -> consulting -> quoted -> deposit_pending
deposit_pending --payment_callback--> deposit_paid -> matching -> confirmed -> prep
prep -> executing -> completed -> reviewed -> settlement_pending -> settled
completed -> settlement_pending
```

异常与取消：

```txt
submitted/consulting/quoted/deposit_pending/deposit_paid/matching/confirmed/prep/executing/completed/reviewed/settlement_pending -> exception
draft/submitted/consulting/quoted/deposit_pending/deposit_paid/matching/confirmed/prep -> cancelled
cancelled/exception --refund_succeeded--> refunded
```

## 关键约束

- 非法状态流转抛出 `BusinessException`。
- `deposit_paid` 只能由支付回调触发。
- `exception` 只能由管理员手动标记。
- 每次成功状态流转写入 `order_status_logs`。
- 每次成功状态流转写入 `audit_logs`。
- 支付回调通过 `provider + event_id` 唯一键幂等。
- 服务完成可自动进入 `settlement_pending`。

## 主要入口

- `PATCH /admin/orders/:orderId/status`
- `POST /admin/orders/:orderId/exception`
- `POST /orders/:orderId/cancel`
- `POST /admin/orders/:orderId/refund`
- `POST /admin/orders/:orderId/complete`
- `POST /payments/callback/deposit-paid`

## 支付模块

位置：`src/modules/payments`

主要入口：

- `POST /orders/:orderId/payments`：创建小程序预支付参数
- `POST /payments/notify/:provider`：支付回调，`provider` 为 `mock` 或 `wechat_pay`
- `POST /admin/orders/:orderId/refunds`：创建退款申请，状态为 `pending`
- `POST /admin/refunds/:refundId/approve`：审批通过退款申请
- `POST /admin/refunds/:refundId/execute`：执行已审批退款

环境变量：

```env
PAYMENT_PROVIDER=mock
PAYMENT_NOTIFY_URL=https://your-domain.com/api/payments/notify/wechat_pay
REFUND_NOTIFY_URL=https://your-domain.com/api/payments/refund-notify
PAYMENT_DEPOSIT_RATE=0.3

WECHAT_PAY_APPID=
WECHAT_PAY_MCHID=
WECHAT_PAY_API_V3_KEY=
WECHAT_PAY_PRIVATE_KEY=
WECHAT_PAY_SERIAL_NO=
```

支付规则：

- `createPayment(orderId)` 只读取后端订单金额，前端不能传金额。
- 如果订单为 `quoted`，创建支付单时推进到 `deposit_pending`。
- 支付成功回调只允许 `deposit_pending -> deposit_paid`。
- `payment_callback_logs` 使用 `provider + event_id` 做幂等。
- 重复回调不会重复更新 `paid_amount`。
- 退款申请只生成 `pending` 记录，必须审批为 `approved` 后才能执行 provider refund。

测试：

```bash
npm install
npm test -- --runInBand
```
