import type { MenuItemConfig } from '@/types/domain';

export const adminMenus: MenuItemConfig[] = [
  { key: 'dashboard', title: '工作台', path: '/dashboard', icon: 'DashboardOutlined', permission: 'dashboard:view' },
  { key: 'customers', title: '客户 CRM', path: '/customers', icon: 'TeamOutlined', permission: 'customer:read' },
  { key: 'leads', title: '需求/线索管理', path: '/leads', icon: 'InboxOutlined', permission: 'lead:read' },
  { key: 'orders', title: '订单管理', path: '/orders', icon: 'ProfileOutlined', permission: 'booking:read' },
  { key: 'assistants', title: '商务助理管理', path: '/assistants', icon: 'IdcardOutlined', permission: 'assistant:read' },
  { key: 'availability', title: '助理档期', path: '/availability', icon: 'CalendarOutlined', permission: 'availability:read' },
  { key: 'matching', title: '排班匹配', path: '/matching', icon: 'BranchesOutlined', permission: 'matching:read' },
  { key: 'meal-briefs', title: '餐前准备', path: '/meal-briefs', icon: 'EditOutlined', permission: 'meal_brief:read' },
  { key: 'finance', title: '支付与财务', path: '/finance', icon: 'WalletOutlined', permission: 'finance:read' },
  { key: 'settlements', title: '结算管理', path: '/settlements', icon: 'AccountBookOutlined', permission: 'settlement:read' },
  { key: 'approvals', title: '审批中心', path: '/approvals', icon: 'CheckSquareOutlined', permission: 'approval:read' },
  { key: 'riskCases', title: '投诉与风控', path: '/risk-cases', icon: 'SafetyCertificateOutlined', permission: 'risk:read' },
  { key: 'cmsPages', title: '内容管理', path: '/cms-pages', icon: 'FileTextOutlined', permission: 'cms:read' },
  { key: 'analytics', title: '数据分析', path: '/analytics', icon: 'BarChartOutlined', permission: 'analytics:read' },
  { key: 'settings', title: '系统设置', path: '/settings', icon: 'SettingOutlined', permission: 'system:read' },
  { key: 'rbac', title: '角色权限', path: '/rbac', icon: 'KeyOutlined', permission: 'rbac:read' },
  { key: 'audit', title: '审计日志', path: '/audit', icon: 'AuditOutlined', permission: 'audit_log:read' }
];

export function hasPermission(userPermissions: string[], permission?: string) {
  if (!permission) return true;
  return userPermissions.includes('*') || userPermissions.includes(permission);
}

export function filterMenus(userPermissions: string[]) {
  return adminMenus.filter(menu => hasPermission(userPermissions, menu.permission));
}
