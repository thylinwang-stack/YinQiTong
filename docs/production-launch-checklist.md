# 生产上线清单

## 当前生产目标

第一阶段生产目标不是“大规模自动化平台”，而是支持真实客户从微信小程序提交需求、确认服务边界、支付预约金，后台能跟进订单、餐前简报、客服、评价、风控和财务记录。

## 代码侧必须完成

- 小程序 `project.config.json` 替换为正式 AppID。
- 小程序 `miniprogram/config/runtime.ts` 切换为 `production + real + https://api.juclub.com.cn`。
- 后端 `PAYMENT_PROVIDER=wechat_pay`。
- 后端 `WECHAT_LOGIN_MOCK=false`。
- 后台 `VITE_USE_MOCK=false`。
- 跑通：

```bash
./scripts/local-check.sh
./scripts/production-preflight.sh
python3 /Users/wangtonglin/Documents/商务饭局小程序开发/scripts/aios_compliance_scan.py
```

## 账号与密钥

- 微信小程序 AppID / AppSecret。
- 微信支付商户号。
- 微信支付 API v3 Key。
- 商户 API 私钥与证书序列号。
- 微信支付平台公钥或平台公钥文件路径。
- 企业微信客服 CorpID 与客服链接。
- 腾讯云 PostgreSQL 数据库密码。
- 后台管理员一次性初始化密码。

所有密钥只进入服务器 `/etc/youge-fanjv/api.env` 或云环境变量，不能写入 Git。

## 腾讯云与域名

- ICP 备案通过后再正式解析域名。
- DNS 建议：
  - `juclub.com.cn`：品牌/落地页。
  - `www.juclub.com.cn`：品牌/落地页。
  - `api.juclub.com.cn`：NestJS API。
  - `admin.juclub.com.cn`：PC 管理后台。
- 防火墙：
  - `22`：SSH，仅管理用途。
  - `80`：HTTP，证书申请与临时访问。
  - `443`：HTTPS，备案和证书完成后开放。
- Nginx 配置模板：`deploy/nginx/juclub.http.conf`。
- systemd 配置模板：`deploy/systemd/youge-api.service`。

## 微信后台

- 配置 request 合法域名：`https://api.juclub.com.cn`。
- 配置 upload/download 合法域名，如果后续启用上传。
- 开通并配置微信支付 JSAPI。
- 支付回调地址：`https://api.juclub.com.cn/payments/notify/wechat_pay`。
- 退款回调地址：`https://api.juclub.com.cn/payments/refund-notify`。
- 配置隐私保护指引：手机号、位置信息、订单信息、支付信息、评价信息、客服沟通记录。

## 业务验收

- 客户提交需求必须包含城市、区域/商圈、场地类型、会合点、到场时间窗口和服务边界协议确认。
- 助理对外只展示公开资料，不展示手机号、微信号、身份证、住址。
- 客户与助理不直接私聊，统一走企业微信客服或受控消息。
- 支付对象必须是平台服务预约金/服务费，不描述为购买某个人。
- 每单必须可生成评价页并可单独转发。
- 风控后台必须能处理投诉、黑名单和异常订单。

## 首次生产部署顺序

1. 备案通过后解析域名。
2. 服务器安装运行环境。
3. 创建 PostgreSQL 数据库和业务用户。
4. 上传 API 代码并生成 Prisma client。
5. 执行数据库迁移或 `prisma db push`。
6. 构建并启动 API systemd 服务。
7. 构建后台并部署到 `/var/www/youge-admin`。
8. 配置 Nginx。
9. 配置 SSL 证书并强制 HTTPS。
10. 小程序切 production runtime、替换 AppID、上传体验版。
11. 真机全链路测试：登录、提交需求、确认协议、支付、回调、订单状态、客服、评价。
