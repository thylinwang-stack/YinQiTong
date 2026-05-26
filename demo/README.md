# 有个饭局 Demo

这个目录是从 GitHub 仓库中的小程序、OA 后台和 API 业务代码抽取出的演示版本，用于快速展示产品形态。

## Demo 入口

- `index.html`：Demo 总入口。
- `mp-preview/index.html`：小程序浏览器预览版，展示首页、提交饭局需求、订单确认、订单进度、员工端餐前 Brief。
- `admin-preview/index.html`：网页版 OA 预览版，展示工作台、订单、商务助理、餐前准备、财务、审批、风控、审计日志。

## 真实代码位置

- 微信小程序源码：`../apps/mp-client/miniprogram`
- OA 后台源码：`../apps/admin-web`
- API 后端源码：`../apps/api`

## 运行方式

静态 Demo 可以直接打开：

```text
demo/index.html
```

真实小程序请用微信开发者工具打开：

```text
apps/mp-client
```

真实 OA 后台默认使用 mock 数据，可进入：

```bash
cd apps/admin-web
npm install
npm run dev
```

