import { AssistantPublicProfile, BookingOrder, ServicePackage, ServiceScene, StaffMealBrief } from './types';

export const scenes: ServiceScene[] = [
  {
    id: 'scene_001',
    code: 'business_dinner',
    name: '商务宴请',
    summary: '让正式饭局更自然，让接待更有分寸。',
    description: '适合客户宴请、合作方接待、重要项目沟通等场景，提供餐前准备、现场礼宾与氛围协同。',
    cover: '/assets/images/home-private-dining-hero.jpg',
    tags: ['客户宴请', '项目沟通', '礼宾接待'],
    serviceScope: ['餐前 brief', '现场礼仪协同', '话题氛围辅助', '平台客服跟进']
  },
  {
    id: 'scene_002',
    code: 'client_reception',
    name: '客户接待',
    summary: '城市到访、商务会面、晚宴接待的一体化协同。',
    description: '围绕客户到访路径、饭局目标和嘉宾背景，安排得体商务助理协同接待。',
    cover: '/assets/images/home-private-dining-hero.jpg',
    tags: ['城市接待', '商务礼仪', '客户关系'],
    serviceScope: ['到访接待建议', '餐前沟通提纲', '现场节奏提醒']
  },
  {
    id: 'scene_003',
    code: 'project_meeting',
    name: '项目沟通',
    summary: '降低初次会面生硬感，增强沟通顺畅度。',
    description: '适合投资、合作、渠道、供应链等项目型交流，强调自然开场、控场分寸和商务表达。',
    cover: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80',
    tags: ['项目交流', '自然破冰', '沟通协同'],
    serviceScope: ['沟通目标梳理', '话题建议', '现场氛围辅助']
  },
  {
    id: 'scene_004',
    code: 'private_gathering',
    name: '朋友小聚',
    summary: '轻商务聚会，不喧闹、不越界、有品质。',
    description: '适合朋友小聚、商务圈层交流、生日或节日聚餐，保持得体、克制和自然。',
    cover: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80',
    tags: ['圈层聚会', '品质氛围', '轻商务'],
    serviceScope: ['场景建议', '现场协同', '结束反馈']
  }
];

export const packages: ServicePackage[] = [
  {
    id: 'pkg_001',
    sceneId: 'scene_001',
    name: '标准商务协同',
    subtitle: '适合 4-8 人正式宴请',
    durationHours: 3,
    assistantCount: 1,
    depositAmount: 600,
    serviceFee: 1800,
    includes: ['1 位商务助理', '餐前 brief', '服务边界确认', '现场协同反馈']
  },
  {
    id: 'pkg_002',
    sceneId: 'scene_001',
    name: '重要客户接待',
    subtitle: '适合高规格客户晚宴',
    durationHours: 4,
    assistantCount: 2,
    depositAmount: 1200,
    serviceFee: 3600,
    includes: ['2 位商务助理', '专属餐前准备', '客户背景梳理', '主管复核 brief']
  },
  {
    id: 'pkg_003',
    sceneId: 'scene_002',
    name: '城市到访礼宾',
    subtitle: '适合外地客户接待',
    durationHours: 5,
    assistantCount: 1,
    depositAmount: 800,
    serviceFee: 2400,
    includes: ['接待路径建议', '商务助理协同', '现场节奏提醒', '服务后复盘']
  },
  {
    id: 'pkg_004',
    sceneId: 'scene_003',
    name: '项目沟通辅助',
    subtitle: '适合首次会面或合作推进',
    durationHours: 3,
    assistantCount: 1,
    depositAmount: 500,
    serviceFee: 1600,
    includes: ['项目目标梳理', '话题建议', '商务表达辅助', '餐后反馈']
  }
];

export const assistants: AssistantPublicProfile[] = [
  {
    id: 'ast_001',
    assistantNo: 'BA-0218',
    workName: '林澈',
    city: '上海',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
    styleTags: ['沉稳', '知性', '商务感'],
    sceneSkills: ['商务宴请', '客户接待'],
    businessSkills: ['自然开场', '话题承接', '礼仪分寸'],
    intro: '擅长正式商务场合的自然破冰与节奏协同，表达克制，注重边界。',
    complianceNote: '仅提供正规商务社交氛围协同、餐前准备与礼宾接待服务。'
  },
  {
    id: 'ast_002',
    assistantNo: 'BA-0346',
    workName: '许知意',
    city: '北京',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    styleTags: ['大方', '亲和', '控场'],
    sceneSkills: ['项目沟通', '朋友小聚'],
    businessSkills: ['轻松破冰', '场面照应', '话题延展'],
    intro: '适合轻商务聚会与项目初谈，能让交流更顺畅，不抢主角。',
    complianceNote: '不展示真实联系方式，所有沟通通过平台客服或受控消息系统。'
  },
  {
    id: 'ast_003',
    assistantNo: 'BA-0521',
    workName: '周予安',
    city: '深圳',
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80',
    styleTags: ['干练', '国际化', '礼宾'],
    sceneSkills: ['客户接待', '城市到访'],
    businessSkills: ['接待礼仪', '英文寒暄', '行程协同'],
    intro: '具备城市到访与客户接待经验，适合高标准商务会面。',
    complianceNote: '平台仅安排合规商务助理服务，不承诺商业结果。'
  }
];

export const mockOrders: BookingOrder[] = [
  {
    id: 'ord_001',
    orderNo: 'BS20260525001',
    status: 'pending_payment',
    sceneName: '商务宴请',
    city: '上海',
    serviceTime: '2026-06-02 19:00',
    assistantCount: 1,
    depositAmount: 600,
    serviceFee: 1800,
    paidAmount: 0,
    createdAt: '2026-05-25 10:30',
    boundaryConfirmed: false
  },
  {
    id: 'ord_002',
    orderNo: 'BS20260521002',
    status: 'brief_preparing',
    sceneName: '客户接待',
    city: '北京',
    serviceTime: '2026-05-29 18:30',
    assistantCount: 2,
    depositAmount: 1200,
    serviceFee: 3600,
    paidAmount: 1200,
    createdAt: '2026-05-21 16:20',
    boundaryConfirmed: true
  }
];

export const staffMealBriefs: StaffMealBrief[] = [
  {
    id: 'brief_001',
    orderId: '11111111-1111-1111-1111-111111111111',
    orderNo: 'BS20260521002',
    status: 'approved',
    banquetTheme: '外地客户到访接待晚宴',
    sceneName: '客户接待',
    city: '北京',
    serviceTime: '2026-05-29 18:30',
    attendeeCount: 7,
    dressCode: '深色商务装，低饱和配饰，整体干净利落。',
    assistantVisibleBrief: '本场为外地客户接待晚宴。目标是让初次会面更自然，建议围绕城市印象、行业趋势、项目经验等轻商务话题展开。注意保持克制，不主动触碰价格底线、竞品负面评价和客户个人隐私。',
    recommendedTopics: ['北京城市印象', '行业趋势', '客户过往项目经验', '团队协作方式'],
    tabooTopics: ['具体价格底线', '竞品负面评价', '客户个人隐私'],
    roleAssignments: [
      { role: '开场协同', owner: 'BA-0346 许知意', responsibility: '提前到场确认座位与称呼，开局协助自然寒暄。' },
      { role: '话题承接', owner: 'BA-0521 周予安', responsibility: '围绕城市到访、行业趋势承接轻商务话题。' }
    ],
    attentionPoints: ['客户到场后先由主陪介绍，助理不主动切入核心议题', '如出现敏感问题，及时转向项目经验或城市话题', '全程不交换私人联系方式'],
    tasks: [
      { id: 'task_001', title: '服务前阅读餐前 brief', detail: '确认宴请主题、现场氛围需求和禁忌话题。', role: '商务助理', status: 'pending', sortOrder: 10 },
      { id: 'task_002', title: '确认着装与到场时间', detail: '按深色商务装执行，服务前 20 分钟到场。', role: '商务助理', status: 'pending', sortOrder: 20 },
      { id: 'task_003', title: '准备推荐话题', detail: '北京城市印象、行业趋势、客户过往项目经验。', role: '商务助理', status: 'pending', sortOrder: 30 },
      { id: 'task_004', title: '避开禁忌话题', detail: '具体价格底线、竞品负面评价、客户个人隐私。', role: '商务助理', status: 'pending', sortOrder: 40 }
    ]
  }
];
