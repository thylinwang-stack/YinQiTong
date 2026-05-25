import type {
  ApprovalRecord,
  AssistantRecord,
  AuditLogRecord,
  BlacklistRecord,
  BasicRecord,
  BookingRecord,
  ComplaintRecord,
  FinanceRecord,
  MealBriefRecord,
  OrderExceptionRecord,
  PublicProfileReviewRecord,
  RiskReportSummary,
  SensitiveWordRecord
} from '@/types/domain';

export const currentUser = {
  id: 'u_admin_001',
  name: '运营管理员',
  roleCodes: ['super_admin'],
  permissions: ['*'],
  cityScope: ['上海', '北京', '深圳', '杭州']
};

export const customers: BasicRecord[] = [
  { id: 'cus_001', no: 'C202605001', name: '陆先生', city: '上海', status: 'active', owner: '顾问 Alice', createdAt: '2026-05-20 10:30', tags: ['企业客户', '高复购'], remark: '偏好正式商务宴请' },
  { id: 'cus_002', no: 'C202605002', name: '辰海科技', city: '北京', status: 'active', owner: '顾问 Ben', createdAt: '2026-05-19 16:20', tags: ['项目接待'], remark: '外地客户到访较多' },
  { id: 'cus_003', no: 'C202605003', name: '周女士', city: '深圳', status: 'pending_review', owner: '顾问 Coco', createdAt: '2026-05-18 14:15', tags: ['新客户'], remark: '首次需求待复核' }
];

export const leads: BasicRecord[] = [
  { id: 'lead_001', no: 'L202605001', name: '上海客户晚宴需求', city: '上海', status: 'pending', owner: '客服 Alice', createdAt: '2026-05-25 09:30', tags: ['商务宴请'], amount: 3600 },
  { id: 'lead_002', no: 'L202605002', name: '北京城市到访接待', city: '北京', status: 'processing', owner: '客服 Ben', createdAt: '2026-05-24 18:10', tags: ['客户接待'], amount: 5200 }
];

export const bookings: BookingRecord[] = [
  {
    id: 'booking_001',
    orderNo: 'BS20260525001',
    customerName: '陆先生',
    sceneName: '商务宴请',
    city: '上海',
    serviceTime: '2026-06-02 19:00',
    assistantCount: 1,
    amount: 1800,
    status: 'pending_match',
    manager: '订单运营 Alice',
    riskLevel: 'normal',
    timeline: [
      { status: 'pending_payment', title: '客户确认协议并创建订单', time: '2026-05-25 10:20', operator: '客户' },
      { status: 'paid', title: '预约金支付成功', time: '2026-05-25 10:23', operator: '微信支付回调' },
      { status: 'pending_match', title: '进入排班匹配', time: '2026-05-25 10:24', operator: '系统' }
    ]
  },
  {
    id: 'booking_002',
    orderNo: 'BS20260521002',
    customerName: '辰海科技',
    sceneName: '客户接待',
    city: '北京',
    serviceTime: '2026-05-29 18:30',
    assistantCount: 2,
    amount: 3600,
    status: 'brief_preparing',
    manager: '订单运营 Ben',
    riskLevel: 'normal',
    timeline: [
      { status: 'paid', title: '预约金支付成功', time: '2026-05-21 16:22', operator: '系统' },
      { status: 'matched', title: '已匹配商务助理', time: '2026-05-22 11:02', operator: '调度主管' },
      { status: 'brief_preparing', title: '餐前 brief 编辑中', time: '2026-05-23 15:40', operator: '客服 Ben' }
    ]
  }
];

export const assistants: AssistantRecord[] = [
  {
    id: 'ast_001',
    assistantNo: 'BA-0218',
    workName: '林澈',
    city: '上海',
    status: 'active',
    publicProfileStatus: 'approved',
    publicProfile: {
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
      imageAuditStatus: 'approved',
      styleTags: ['沉稳', '知性', '商务感'],
      sceneSkills: ['商务宴请', '客户接待'],
      businessSkills: ['自然开场', '话题承接', '礼仪分寸'],
      publicIntro: '适合正式商务场合的自然破冰与节奏协同。'
    },
    internalProfile: {
      realName: '林**',
      phoneMasked: '138****2108',
      idNumberMasked: '310***********0821',
      internalTags: ['高评分', '稳定履约'],
      internalNote: '适合高规格客户宴请，避免安排过度活跃场景。',
      trainingRecords: ['商务礼仪 A 级', '合规培训已完成']
    }
  },
  {
    id: 'ast_002',
    assistantNo: 'BA-0346',
    workName: '许知意',
    city: '北京',
    status: 'active',
    publicProfileStatus: 'approved',
    publicProfile: {
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
      imageAuditStatus: 'manual_review',
      styleTags: ['大方', '亲和', '控场'],
      sceneSkills: ['项目沟通', '朋友小聚'],
      businessSkills: ['轻松破冰', '场面照应', '话题延展'],
      publicIntro: '适合轻商务聚会与项目初谈，表达自然。'
    },
    internalProfile: {
      realName: '许**',
      phoneMasked: '186****9132',
      idNumberMasked: '110***********1542',
      internalTags: ['项目沟通', '英文基础'],
      internalNote: '近期周末档期较紧。',
      trainingRecords: ['餐前 brief 训练已完成']
    }
  }
];

export const availability: BasicRecord[] = [
  { id: 'av_001', no: 'AV202605001', name: '林澈 6月可服务档期', city: '上海', status: 'active', owner: '档期管理员', createdAt: '2026-05-25 08:00', tags: ['6月', '晚间'] },
  { id: 'av_002', no: 'AV202605002', name: '许知意 重点客户预留', city: '北京', status: 'pending', owner: '调度主管', createdAt: '2026-05-24 20:00', tags: ['锁定', '重要接待'] }
];

export const matching: BasicRecord[] = [
  { id: 'match_001', no: 'M202605001', name: 'BS20260525001 待匹配', city: '上海', status: 'pending_match', owner: '调度主管', createdAt: '2026-05-25 10:24', tags: ['商务宴请'], amount: 1800 },
  { id: 'match_002', no: 'M202605002', name: 'BS20260521002 已匹配', city: '北京', status: 'matched', owner: '调度主管', createdAt: '2026-05-22 11:02', tags: ['客户接待'], amount: 3600 }
];

export const mealBriefs: MealBriefRecord[] = [
  {
    id: 'brief_001',
    orderId: 'booking_002',
    bookingNo: 'BS20260521002',
    customerName: '辰海科技',
    sceneName: '客户接待',
    city: '北京',
    serviceTime: '2026-05-29 18:30',
    assistantCount: 2,
    status: 'submitted',
    banquetTheme: '外地客户到访接待晚宴',
    customerBackground: '客户为华东区渠道负责人，第一次到访北京团队，关注项目交付稳定性与长期合作节奏。',
    diningPurpose: '降低初次会面的生硬感，帮助双方在正式议题之外建立基础信任。',
    attendeeCount: 7,
    guestIdentities: ['渠道负责人', '项目负责人', '陪同商务经理'],
    atmosphereNeeds: '克制、稳重、自然破冰，不抢客户主场。',
    tabooTopics: ['具体价格底线', '竞品负面评价', '客户个人隐私'],
    recommendedTopics: ['北京城市印象', '行业趋势', '客户过往项目经验', '团队协作方式'],
    dressCode: '深色商务装，低饱和配饰，整体干净利落。',
    roleAssignments: [
      { role: '开场协同', owner: 'BA-0346 许知意', responsibility: '提前到场确认座位与称呼，开局协助自然寒暄。' },
      { role: '话题承接', owner: 'BA-0521 周予安', responsibility: '围绕城市到访、行业趋势承接轻商务话题。' }
    ],
    attentionPoints: ['客户到场后先由主陪介绍，助理不主动切入核心议题', '如出现敏感问题，及时转向项目经验或城市话题', '全程不交换私人联系方式'],
    managerPrivateNote: '客户对现场节奏要求较高，运营需提醒助理保持克制；如客户追问排他安排，统一由平台客服解释服务边界。',
    assistantVisibleBrief: '本场为外地客户接待晚宴。目标是让初次会面更自然，建议围绕城市印象、行业趋势、项目经验等轻商务话题展开。注意保持克制，不主动触碰价格底线、竞品负面评价和客户个人隐私。',
    tasks: [
      { id: 'task_001', title: '服务前阅读餐前 brief', detail: '确认宴请主题、现场氛围需求和禁忌话题。', role: '商务助理', status: 'pending', sortOrder: 10 },
      { id: 'task_002', title: '确认着装与到场时间', detail: '按深色商务装执行，服务前 20 分钟到场。', role: '商务助理', status: 'pending', sortOrder: 20 },
      { id: 'task_003', title: '准备推荐话题', detail: '北京城市印象、行业趋势、客户过往项目经验。', role: '商务助理', status: 'pending', sortOrder: 30 }
    ],
    submittedBy: '客服 Ben',
    submittedAt: '2026-05-23 16:10',
    updatedAt: '2026-05-23 15:40'
  },
  {
    id: 'brief_002',
    orderId: 'booking_001',
    bookingNo: 'BS20260525001',
    customerName: '陆先生',
    sceneName: '商务宴请',
    city: '上海',
    serviceTime: '2026-06-02 19:00',
    assistantCount: 1,
    status: 'draft',
    banquetTheme: '合作方答谢晚宴',
    customerBackground: '客户为长期合作方，偏好正式但不沉闷的商务宴请氛围。',
    diningPurpose: '答谢合作并为后续项目沟通预留自然空间。',
    attendeeCount: 6,
    guestIdentities: ['合作方负责人', '客户公司商务负责人'],
    atmosphereNeeds: '有品质、有分寸，避免过度热闹。',
    tabooTopics: ['合同争议', '家庭隐私'],
    recommendedTopics: ['近期行业变化', '城市餐饮体验', '合作过程中的积极案例'],
    dressCode: '商务休闲偏正式。',
    roleAssignments: [
      { role: '氛围协同', owner: 'BA-0218 林澈', responsibility: '负责自然开场与话题承接。' }
    ],
    attentionPoints: ['尊重主陪节奏', '避免询问客户隐私', '不承诺任何商业结果'],
    managerPrivateNote: '客户首次在平台下单，客服需在服务前再次确认边界协议。',
    assistantVisibleBrief: '本场为合作方答谢晚宴，目标是让饭局正式但不沉闷。建议围绕行业变化、城市餐饮体验、合作积极案例展开，避免合同争议和家庭隐私。',
    tasks: [],
    updatedAt: '2026-05-25 11:30'
  }
];

export const financeRecords: FinanceRecord[] = [
  { id: 'pay_001', no: 'PAY20260525001', type: 'payment', orderNo: 'BS20260525001', subject: '商务接待氛围服务预约金', amount: 600, status: 'paid', provider: 'wechat_pay', createdAt: '2026-05-25 10:23' },
  { id: 'ref_001', no: 'REF20260519001', type: 'refund', orderNo: 'BS20260518003', subject: '订单取消退款', amount: 500, status: 'processing', provider: 'wechat_pay', createdAt: '2026-05-19 12:10' },
  { id: 'set_001', no: 'SET20260522001', type: 'settlement', orderNo: 'BS20260521002', subject: '助理服务结算', amount: 1200, status: 'pending', createdAt: '2026-05-22 20:00' }
];

export const settlements: BasicRecord[] = [
  { id: 'settle_001', no: 'SET20260522001', name: 'BA-0346 服务结算', city: '北京', status: 'pending', owner: '财务 May', createdAt: '2026-05-22 20:00', amount: 1200, tags: ['待审批'] },
  { id: 'settle_002', no: 'SET20260516001', name: 'BA-0218 服务结算', city: '上海', status: 'paid', owner: '财务 May', createdAt: '2026-05-16 21:00', amount: 900, tags: ['已打款'] }
];

export const approvals: ApprovalRecord[] = [
  { id: 'ap_001', approvalNo: 'AP20260525001', bizType: '退款审批', title: 'BS20260518003 退款申请', applicant: '客服 Alice', status: 'pending', amount: 500, createdAt: '2026-05-25 11:00' },
  { id: 'ap_002', approvalNo: 'AP20260524002', bizType: '结算审批', title: 'BA-0346 服务结算', applicant: '财务 May', status: 'approved', amount: 1200, createdAt: '2026-05-24 17:30', remark: '资料完整' }
];

export const riskCases: BasicRecord[] = [
  { id: 'risk_001', no: 'R202605001', name: '客户需求敏感词命中', city: '深圳', status: 'risk_hold', owner: '风控 Leo', createdAt: '2026-05-24 13:10', tags: ['人工复核'] }
];

export const sensitiveWords: SensitiveWordRecord[] = [
  { id: 'sw_001', keyword: '特殊服务', category: 'boundary_violation', level: 'critical', status: 'active', hitCount: 8, note: '服务边界高风险词', updatedAt: '2026-05-25 09:00' },
  { id: 'sw_002', keyword: '私下联系', category: 'off_platform_contact', level: 'high', status: 'active', hitCount: 12, note: '绕开平台沟通', updatedAt: '2026-05-25 09:00' },
  { id: 'sw_003', keyword: '微信号', category: 'public_contact', level: 'high', status: 'active', hitCount: 6, note: '公开联系方式', updatedAt: '2026-05-25 09:00' }
];

export const profileReviews: PublicProfileReviewRecord[] = [
  {
    id: 'pr_001',
    assistantNo: 'BA-0521',
    workName: '周予安',
    status: 'risk_hold',
    imageAuditStatus: 'manual_review',
    riskLevel: 'high',
    findings: [{ keyword: '微信号', category: 'public_contact', level: 'high' }],
    contentSnapshot: { publicIntro: '擅长商务礼宾接待，资料中出现联系方式待删除。' },
    rejectionReason: '对外展示资料不得出现联系方式',
    updatedAt: '2026-05-25 10:40'
  }
];

export const complaints: ComplaintRecord[] = [
  {
    id: 'cp_001',
    complaintNo: 'CP20260525001',
    orderNo: 'BS20260521002',
    complainantType: 'customer',
    category: 'service_boundary',
    description: '客户反馈现场沟通节奏与预期不一致，要求运营复核 brief 和执行记录。',
    status: 'processing',
    priority: 'medium',
    handler: '风控 Leo',
    createdAt: '2026-05-25 12:10'
  }
];

export const blacklistEntries: BlacklistRecord[] = [
  { id: 'bl_001', subjectType: 'customer', subjectName: '高风险测试客户', reason: '多次提出越界需求并试图绕过平台沟通', status: 'active', createdAt: '2026-05-24 18:00' }
];

export const orderExceptions: OrderExceptionRecord[] = [
  { id: 'ex_001', exceptionNo: 'EX20260525001', orderNo: 'BS20260525001', category: 'protocol_missing', riskLevel: 'high', status: 'open', summary: '助理协议确认缺失，订单不得进入执行', handler: '风控 Leo', createdAt: '2026-05-25 13:20' }
];

export const riskReport: RiskReportSummary = {
  pendingProfileReviews: 1,
  pendingComplaints: 1,
  activeBlacklist: 1,
  openExceptions: 1,
  highRiskEvents: 2
};

export const cmsPages: BasicRecord[] = [
  { id: 'cms_001', no: 'CMS_HOME', name: '首页品牌文案', city: '全局', status: 'published', owner: '内容运营', createdAt: '2026-05-20 09:00', tags: ['首页'] },
  { id: 'cms_002', no: 'CMS_POLICY', name: '服务边界协议', city: '全局', status: 'draft', owner: '内容运营', createdAt: '2026-05-21 15:30', tags: ['协议'] }
];

export const analytics: BasicRecord[] = [
  { id: 'ana_001', no: 'DASH_ORDER', name: '订单转化漏斗', city: '全局', status: 'active', owner: '数据分析', createdAt: '2026-05-25 08:30', amount: 86, tags: ['转化率'] },
  { id: 'ana_002', no: 'DASH_ASSISTANT', name: '助理利用率', city: '全局', status: 'active', owner: '数据分析', createdAt: '2026-05-25 08:30', amount: 72, tags: ['履约'] }
];

export const settings: BasicRecord[] = [
  { id: 'cfg_001', no: 'CITY_SH', name: '上海城市配置', city: '上海', status: 'active', owner: '系统管理员', createdAt: '2026-05-18 10:00', tags: ['城市'] },
  { id: 'cfg_002', no: 'TAG_STYLE', name: '助理风格标签', city: '全局', status: 'active', owner: '系统管理员', createdAt: '2026-05-18 10:00', tags: ['标签'] }
];

export const auditLogs: AuditLogRecord[] = [
  { id: 'log_001', actor: '运营管理员', action: 'booking.update_status', resourceType: 'booking', resourceId: 'booking_001', ip: '127.0.0.1', createdAt: '2026-05-25 10:24', metadata: { from: 'paid', to: 'pending_match' } },
  { id: 'log_002', actor: '财务 May', action: 'payment.callback_processed', resourceType: 'payment', resourceId: 'pay_001', ip: '127.0.0.1', createdAt: '2026-05-25 10:23', metadata: { provider: 'wechat_pay' } }
];

export const roles = [
  { id: 'role_001', code: 'super_admin', name: '超级管理员', permissions: ['*'] },
  { id: 'role_002', code: 'order_operator', name: '订单运营', permissions: ['dashboard:view', 'booking:read', 'booking:update', 'meal_brief:read', 'meal_brief:update', 'meal_brief:manager_note:read', 'meal_brief:submit', 'meal_brief:approve', 'meal_brief:generate_tasks', 'meal_brief:reminder', 'meal_brief:review', 'audit_log:create'] },
  { id: 'role_003', code: 'finance', name: '财务人员', permissions: ['finance:read', 'refund:approve', 'settlement:update', 'audit_log:create'] },
  { id: 'role_004', code: 'risk', name: '风控合规', permissions: ['risk:read', 'risk:update', 'risk:report', 'risk:profile_review', 'risk:blacklist', 'risk:complaint', 'risk:exception', 'audit_log:read', 'audit_log:create'] }
];
