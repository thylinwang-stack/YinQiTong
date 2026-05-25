export interface CrudModuleConfig {
  moduleKey: string;
  title: string;
  description: string;
  auditResource: string;
  createPermission: string;
  updatePermission: string;
  columns: Array<{
    title: string;
    dataIndex: string;
    width?: number;
    type?: 'status' | 'money' | 'tags';
  }>;
  statusOptions: Array<{ label: string; value: string }>;
}

export const crudModules: Record<string, CrudModuleConfig> = {
  customers: {
    moduleKey: 'customers',
    title: '客户 CRM',
    description: '维护客户资料、跟进记录、城市归属和风险标签。',
    auditResource: 'customer',
    createPermission: 'customer:create',
    updatePermission: 'customer:update',
    statusOptions: [
      { label: '启用', value: 'active' },
      { label: '待审核', value: 'pending_review' },
      { label: '停用', value: 'disabled' }
    ],
    columns: [
      { title: '客户编号', dataIndex: 'no', width: 150 },
      { title: '客户名称', dataIndex: 'name' },
      { title: '城市', dataIndex: 'city', width: 100 },
      { title: '状态', dataIndex: 'status', type: 'status', width: 120 },
      { title: '负责人', dataIndex: 'owner', width: 130 },
      { title: '标签', dataIndex: 'tags', type: 'tags' },
      { title: '创建时间', dataIndex: 'createdAt', width: 170 }
    ]
  },
  leads: {
    moduleKey: 'leads',
    title: '需求/线索管理',
    description: '承接客户初始需求，进入订单前完成合规判断与需求补充。',
    auditResource: 'lead',
    createPermission: 'lead:create',
    updatePermission: 'lead:update',
    statusOptions: [
      { label: '待处理', value: 'pending' },
      { label: '处理中', value: 'processing' },
      { label: '已完成', value: 'completed' }
    ],
    columns: [
      { title: '线索编号', dataIndex: 'no', width: 150 },
      { title: '需求名称', dataIndex: 'name' },
      { title: '城市', dataIndex: 'city', width: 100 },
      { title: '状态', dataIndex: 'status', type: 'status', width: 120 },
      { title: '预算', dataIndex: 'amount', type: 'money', width: 120 },
      { title: '负责人', dataIndex: 'owner', width: 130 },
      { title: '创建时间', dataIndex: 'createdAt', width: 170 }
    ]
  },
  availability: {
    moduleKey: 'availability',
    title: '助理档期',
    description: '维护商务助理可服务时间、锁定状态和城市资源池。',
    auditResource: 'availability',
    createPermission: 'availability:create',
    updatePermission: 'availability:update',
    statusOptions: [
      { label: '启用', value: 'active' },
      { label: '待处理', value: 'pending' },
      { label: '停用', value: 'disabled' }
    ],
    columns: [
      { title: '档期编号', dataIndex: 'no', width: 150 },
      { title: '档期名称', dataIndex: 'name' },
      { title: '城市', dataIndex: 'city', width: 100 },
      { title: '状态', dataIndex: 'status', type: 'status', width: 120 },
      { title: '负责人', dataIndex: 'owner', width: 130 },
      { title: '标签', dataIndex: 'tags', type: 'tags' },
      { title: '创建时间', dataIndex: 'createdAt', width: 170 }
    ]
  },
  matching: {
    moduleKey: 'matching',
    title: '排班匹配',
    description: '根据城市、档期、标签、场景能力完成候选助理匹配和派发。',
    auditResource: 'matching',
    createPermission: 'matching:create',
    updatePermission: 'matching:update',
    statusOptions: [
      { label: '待匹配', value: 'pending_match' },
      { label: '已匹配', value: 'matched' },
      { label: '风控冻结', value: 'risk_hold' }
    ],
    columns: [
      { title: '匹配单号', dataIndex: 'no', width: 150 },
      { title: '任务名称', dataIndex: 'name' },
      { title: '城市', dataIndex: 'city', width: 100 },
      { title: '状态', dataIndex: 'status', type: 'status', width: 120 },
      { title: '金额', dataIndex: 'amount', type: 'money', width: 120 },
      { title: '负责人', dataIndex: 'owner', width: 130 },
      { title: '创建时间', dataIndex: 'createdAt', width: 170 }
    ]
  },
  riskCases: {
    moduleKey: 'riskCases',
    title: '投诉与风控',
    description: '处理投诉、黑名单、异常订单和敏感内容复核。',
    auditResource: 'risk_case',
    createPermission: 'risk:create',
    updatePermission: 'risk:update',
    statusOptions: [
      { label: '待处理', value: 'pending' },
      { label: '处理中', value: 'processing' },
      { label: '风控冻结', value: 'risk_hold' },
      { label: '已完成', value: 'completed' }
    ],
    columns: [
      { title: '风险编号', dataIndex: 'no', width: 150 },
      { title: '风险事项', dataIndex: 'name' },
      { title: '城市', dataIndex: 'city', width: 100 },
      { title: '状态', dataIndex: 'status', type: 'status', width: 120 },
      { title: '负责人', dataIndex: 'owner', width: 130 },
      { title: '标签', dataIndex: 'tags', type: 'tags' },
      { title: '创建时间', dataIndex: 'createdAt', width: 170 }
    ]
  },
  cmsPages: {
    moduleKey: 'cmsPages',
    title: '内容管理',
    description: '维护首页、场景套餐、协议文案、FAQ 与助理展示内容。',
    auditResource: 'cms_page',
    createPermission: 'cms:create',
    updatePermission: 'cms:update',
    statusOptions: [
      { label: '草稿', value: 'draft' },
      { label: '已发布', value: 'published' }
    ],
    columns: [
      { title: '内容编号', dataIndex: 'no', width: 150 },
      { title: '内容名称', dataIndex: 'name' },
      { title: '范围', dataIndex: 'city', width: 100 },
      { title: '状态', dataIndex: 'status', type: 'status', width: 120 },
      { title: '负责人', dataIndex: 'owner', width: 130 },
      { title: '标签', dataIndex: 'tags', type: 'tags' },
      { title: '创建时间', dataIndex: 'createdAt', width: 170 }
    ]
  },
  analytics: {
    moduleKey: 'analytics',
    title: '数据分析',
    description: '查看订单转化、客户复购、助理利用率、财务和风控指标。',
    auditResource: 'analytics',
    createPermission: 'analytics:create',
    updatePermission: 'analytics:update',
    statusOptions: [{ label: '启用', value: 'active' }],
    columns: [
      { title: '指标编号', dataIndex: 'no', width: 150 },
      { title: '指标名称', dataIndex: 'name' },
      { title: '范围', dataIndex: 'city', width: 100 },
      { title: '状态', dataIndex: 'status', type: 'status', width: 120 },
      { title: '数值', dataIndex: 'amount', width: 120 },
      { title: '负责人', dataIndex: 'owner', width: 130 },
      { title: '更新时间', dataIndex: 'createdAt', width: 170 }
    ]
  },
  settings: {
    moduleKey: 'settings',
    title: '系统设置',
    description: '维护城市、标签、消息模板、支付配置和基础系统参数。',
    auditResource: 'setting',
    createPermission: 'system:create',
    updatePermission: 'system:update',
    statusOptions: [
      { label: '启用', value: 'active' },
      { label: '停用', value: 'disabled' }
    ],
    columns: [
      { title: '配置编号', dataIndex: 'no', width: 150 },
      { title: '配置名称', dataIndex: 'name' },
      { title: '范围', dataIndex: 'city', width: 100 },
      { title: '状态', dataIndex: 'status', type: 'status', width: 120 },
      { title: '负责人', dataIndex: 'owner', width: 130 },
      { title: '标签', dataIndex: 'tags', type: 'tags' },
      { title: '创建时间', dataIndex: 'createdAt', width: 170 }
    ]
  },
  settlements: {
    moduleKey: 'settlements',
    title: '结算管理',
    description: '管理商务助理结算单、审批状态和付款结果。',
    auditResource: 'settlement',
    createPermission: 'settlement:create',
    updatePermission: 'settlement:update',
    statusOptions: [
      { label: '待处理', value: 'pending' },
      { label: '已通过', value: 'approved' },
      { label: '已支付', value: 'paid' },
      { label: '已驳回', value: 'rejected' }
    ],
    columns: [
      { title: '结算编号', dataIndex: 'no', width: 150 },
      { title: '结算名称', dataIndex: 'name' },
      { title: '城市', dataIndex: 'city', width: 100 },
      { title: '状态', dataIndex: 'status', type: 'status', width: 120 },
      { title: '金额', dataIndex: 'amount', type: 'money', width: 120 },
      { title: '负责人', dataIndex: 'owner', width: 130 },
      { title: '创建时间', dataIndex: 'createdAt', width: 170 }
    ]
  }
};
