import type { RouteRecordRaw } from 'vue-router';
import AdminLayout from '@/layouts/AdminLayout.vue';

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/LoginPage.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/dashboard/WorkbenchPage.vue'), meta: { title: '工作台', permission: 'dashboard:view' } },
      { path: 'customers', name: 'customers', component: () => import('@/views/common/CrudListView.vue'), meta: { title: '客户 CRM', permission: 'customer:read', moduleKey: 'customers' } },
      { path: 'leads', name: 'leads', component: () => import('@/views/common/CrudListView.vue'), meta: { title: '需求/线索管理', permission: 'lead:read', moduleKey: 'leads' } },
      { path: 'orders', name: 'orders', component: () => import('@/views/orders/OrderListPage.vue'), meta: { title: '订单管理', permission: 'booking:read' } },
      { path: 'assistants', name: 'assistants', component: () => import('@/views/assistants/AssistantListPage.vue'), meta: { title: '商务助理管理', permission: 'assistant:read' } },
      { path: 'availability', name: 'availability', component: () => import('@/views/common/CrudListView.vue'), meta: { title: '助理档期', permission: 'availability:read', moduleKey: 'availability' } },
      { path: 'matching', name: 'matching', component: () => import('@/views/common/CrudListView.vue'), meta: { title: '排班匹配', permission: 'matching:read', moduleKey: 'matching' } },
      { path: 'meal-briefs', name: 'meal-briefs', component: () => import('@/views/meal-briefs/MealBriefPage.vue'), meta: { title: '餐前准备', permission: 'meal_brief:read' } },
      { path: 'finance', name: 'finance', component: () => import('@/views/finance/FinancePage.vue'), meta: { title: '支付与财务', permission: 'finance:read' } },
      { path: 'settlements', name: 'settlements', component: () => import('@/views/common/CrudListView.vue'), meta: { title: '结算管理', permission: 'settlement:read', moduleKey: 'settlements' } },
      { path: 'approvals', name: 'approvals', component: () => import('@/views/approvals/ApprovalCenterPage.vue'), meta: { title: '审批中心', permission: 'approval:read' } },
      { path: 'risk-cases', name: 'risk-cases', component: () => import('@/views/risk/RiskCompliancePage.vue'), meta: { title: '投诉与风控', permission: 'risk:read' } },
      { path: 'cms-pages', name: 'cms-pages', component: () => import('@/views/common/CrudListView.vue'), meta: { title: '内容管理', permission: 'cms:read', moduleKey: 'cmsPages' } },
      { path: 'analytics', name: 'analytics', component: () => import('@/views/common/CrudListView.vue'), meta: { title: '数据分析', permission: 'analytics:read', moduleKey: 'analytics' } },
      { path: 'settings', name: 'settings', component: () => import('@/views/common/CrudListView.vue'), meta: { title: '系统设置', permission: 'system:read', moduleKey: 'settings' } },
      { path: 'rbac', name: 'rbac', component: () => import('@/views/rbac/RolePermissionPage.vue'), meta: { title: '角色权限', permission: 'rbac:read' } },
      { path: 'audit', name: 'audit', component: () => import('@/views/audit/AuditLogPage.vue'), meta: { title: '审计日志', permission: 'audit_log:read' } }
    ]
  },
  { path: '/403', name: 'forbidden', component: () => import('@/views/common/ForbiddenPage.vue'), meta: { public: true } },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
];
