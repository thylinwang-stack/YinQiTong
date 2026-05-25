# PC 管理后台

Vue3 + TypeScript + Ant Design Vue。定位为商务社交助理与礼宾接待平台的 OA 级内部运营管理系统。

## 目录结构

```txt
src/
  api/                 # API client，默认 mock，可切换真实后端
  components/          # 状态标签、审计提示等通用组件
  config/              # 菜单配置、通用列表模块配置
  layouts/             # 后台整体布局
  mock/                # mock 数据
  router/              # 路由与权限守卫
  stores/              # 登录态与权限状态
  styles/              # 全局样式
  types/               # 业务类型
  utils/               # 状态文案和标签映射
  views/               # 页面
```

## 已实现模块

- 登录
- RBAC 菜单权限与路由守卫
- 工作台
- 客户 CRM
- 需求/线索管理
- 订单管理，含订单状态时间线
- 商务助理管理，区分内部资料和对外展示资料
- 助理档期
- 排班匹配
- 餐前准备，含 manager_private_note 与 assistant_visible_brief 编辑器
- 支付与财务，覆盖支付、退款、结算
- 结算管理
- 审批中心，支持通过、驳回、备注
- 投诉与风控
- 内容管理
- 数据分析
- 系统设置
- 角色权限
- 审计日志

## API 切换

默认使用 mock：

```env
VITE_USE_MOCK=true
```

接真实后端时：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://your-api.example.com/api
```

真实后端模式下，登录走 `/auth/admin/login`，菜单和路由根据 `permissions` 过滤；订单、助理、餐前 brief、风控和退款接口均由后端 RBAC 守卫控制。助理管理已接入新增、内部资料编辑、对外资料编辑、照片上传接口；关键操作由后端统一写入 `audit_logs`。
