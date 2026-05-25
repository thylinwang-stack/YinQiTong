# 风控合规模块

## 数据库表

- `risk_sensitive_words`：敏感词库，按分类、等级和状态管理。
- `assistant_public_profiles`：商务助理对外展示资料，包含 `image_audit_status` 和资料审核状态。
- `public_profile_reviews`：对外展示资料审核记录，保存快照、命中项、图片审核状态和驳回原因。
- `protocol_confirmations`：服务边界协议确认记录，区分 `customer` 与 `assistant`。
- `complaints`：投诉管理。
- `blacklist_entries`：黑名单管理。
- `order_exception_cases`：异常订单处理。
- `risk_events`：风险事件流水。
- `risk_reports`：管理员风险报告。
- `audit_logs`：所有关键风控操作审计日志。

## API

- `GET/POST/PATCH /admin/risk/sensitive-words`
- `POST /admin/risk/detect`
- `GET/POST /admin/risk/profile-reviews`
- `POST /admin/risk/profile-reviews/:id/decision`
- `POST /protocol-confirmations`
- `GET /admin/risk/orders/:orderId/protocol-ready`
- `GET/POST/PATCH /admin/risk/complaints`
- `GET/POST/PATCH /admin/risk/blacklist`
- `GET/POST/PATCH /admin/risk/order-exceptions`
- `GET /admin/risk/report`
- `POST /admin/risk/reports`

## 后台页面

路径：`/risk-cases`。

页面包含风险报告、对外资料审核、敏感词库、投诉管理、黑名单、异常订单六个工作区。资料审核中，图片审核未通过不能批准公开展示。

## 小程序协议确认

- 客户端订单确认页必须勾选服务边界协议，创建订单时带上 `boundaryAgreementConfirmed=true`，并写入 `protocol_confirmations`。
- 员工端在确认餐前 brief 前必须勾选服务边界协议，写入 `assistant` 类型确认记录。
- 风控 API 提供 `protocol-ready` 检查，订单执行前需要同时存在客户和助理确认记录。

## 敏感词检测

核心函数：`detectSensitiveContent(text, rules)`。

检测内容包括：敏感词库命中、手机号模式、微信等公开联系方式模式。返回 `safe`、`level`、`hits` 和 `sanitizedText`。

## 测试

已添加 `risk-detector.spec.ts`，覆盖边界风险词、公开手机号和合规资料文案。
