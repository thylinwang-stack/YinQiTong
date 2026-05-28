# 本地验收运行手册

## 当前状态

本地代码检查已打通：

- 小程序：`npm run typecheck`
- API：`npm run typecheck`
- API 测试：`npm test -- --runInBand`
- 管理后台：`npm run build`

本机已安装：

- PostgreSQL：`/Applications/Postgres.app`
- 微信开发者工具：`/Applications/wechatwebdevtools.app`

## 一键检查

```bash
./scripts/local-check.sh
```

## 小程序预览

小程序当前默认使用 mock service。

项目路径：

```text
/Users/wangtonglin/Documents/商务饭局小程序开发/apps/mp-client
```

打开微信开发者工具并导入小程序项目：

```bash
./scripts/mp-open.sh
```

脚本会先执行 `apps/mp-client` 的 `npm run build`，把 TypeScript 页面编译成微信模拟器可直接识别的 `.js` 文件。

也可以在微信开发者工具里手动导入上述目录。当前 `project.config.json` 使用 `touristappid`，适合本地游客模式预览。上传、真机调试和正式体验版需要先在微信开发者工具里扫码登录，并把 AppID 替换为正式 AppID。

## 管理后台本地生产预览

默认 mock 模式，配置在：

```text
apps/admin-web/.env
```

启动：

```bash
./scripts/admin-preview.sh
```

默认地址：

```text
http://127.0.0.1:4173
```

## API 本地开发

API 配置在：

```text
apps/api/.env
```

默认使用 mock 微信登录和 mock 支付，但仍需要 PostgreSQL：

```text
postgresql://postgres:postgres@127.0.0.1:5432/business_concierge
```

启动本地 PostgreSQL、初始化 `business_concierge` 数据库、同步 Prisma schema，并启动 API：

```bash
./scripts/api-dev.sh
```

只启动本地 PostgreSQL：

```bash
./scripts/postgres-local.sh
```

本地数据目录：

```text
.tmp/postgres-data
```

## 切换小程序真实 API

文件：

```text
apps/mp-client/miniprogram/app.ts
```

把：

```ts
apiMode: 'mock'
```

改为：

```ts
apiMode: 'real'
```

并确认：

```ts
apiBaseUrl: 'http://127.0.0.1:3000'
```

在真机和微信审核环境中，API 必须换成 HTTPS 合法域名。

## 下一步阻塞项

真实发布前还需要：

- 提供正式小程序 AppID/AppSecret 后再切真实登录。
- 配置线上 HTTPS API 域名和微信后台合法域名。
