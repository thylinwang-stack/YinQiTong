import axios from 'axios';
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
  PageQuery,
  PageResult,
  PublicProfileReviewRecord,
  RiskDetectionResult,
  RiskReportSummary,
  SensitiveWordRecord,
  UserProfile
} from '@/types/domain';
import {
  analytics,
  approvals,
  assistants,
  auditLogs,
  availability,
  blacklistEntries,
  bookings,
  cmsPages,
  complaints,
  currentUser,
  customers,
  financeRecords,
  leads,
  matching,
  mealBriefs,
  orderExceptions,
  profileReviews,
  riskCases,
  riskReport,
  roles,
  settings,
  sensitiveWords,
  settlements
} from '@/mock/mock-data';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 12000
});

http.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function wait<T>(value: T, ms = 180): Promise<T> {
  return new Promise(resolve => window.setTimeout(() => resolve(value), ms));
}

function page<T>(list: T[], query: PageQuery = {}): PageResult<T> {
  const keyword = String(query.keyword || '').trim();
  const status = String(query.status || '').trim();
  const city = String(query.city || '').trim();
  const filtered = list.filter(item => {
    const record = item as Record<string, unknown>;
    const text = JSON.stringify(item);
    const matchKeyword = !keyword || text.includes(keyword);
    const matchStatus = !status || record.status === status;
    const matchCity = !city || record.city === city;
    return matchKeyword && matchStatus && matchCity;
  });
  const pageNo = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 10);
  const start = (pageNo - 1) * pageSize;
  return {
    list: filtered.slice(start, start + pageSize),
    total: filtered.length
  };
}

function prependAudit(action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown> = {}) {
  auditLogs.unshift({
    id: `log_${Date.now()}`,
    actor: currentUser.name,
    action,
    resourceType,
    resourceId,
    ip: '127.0.0.1',
    createdAt: new Date().toLocaleString(),
    metadata
  });
}

function composeAssistantBrief(input: Partial<MealBriefRecord>) {
  return [
    input.banquetTheme ? `宴请主题：${input.banquetTheme}` : '',
    input.diningPurpose ? `饭局目的：${input.diningPurpose}` : '',
    input.atmosphereNeeds ? `现场氛围需求：${input.atmosphereNeeds}` : '',
    input.dressCode ? `着装要求：${input.dressCode}` : '',
    input.recommendedTopics?.length ? `推荐话题：${input.recommendedTopics.join('、')}` : '',
    input.tabooTopics?.length ? `禁忌话题：${input.tabooTopics.join('、')}` : '',
    input.attentionPoints?.length ? `注意事项：${input.attentionPoints.join('、')}` : ''
  ].filter(Boolean).join('\n');
}

function buildMealBriefTasks(record: MealBriefRecord): NonNullable<MealBriefRecord['tasks']> {
  const roleDetail = (record.roleAssignments || [])
    .map(item => `${item.role}${item.owner ? `-${item.owner}` : ''}：${item.responsibility}`)
    .join('\n');
  return [
    {
      id: `task_${record.id}_10`,
      title: '服务前阅读餐前 brief',
      detail: record.assistantVisibleBrief,
      role: '商务助理',
      status: 'pending',
      sortOrder: 10
    },
    {
      id: `task_${record.id}_20`,
      title: '确认着装与到场时间',
      detail: record.dressCode || '按商务正式、克制得体原则执行',
      role: '商务助理',
      status: 'pending',
      sortOrder: 20
    },
    {
      id: `task_${record.id}_30`,
      title: '准备推荐话题',
      detail: (record.recommendedTopics || []).join('、') || '围绕客户背景、城市、行业趋势等轻商务话题展开',
      role: '商务助理',
      status: 'pending',
      sortOrder: 30
    },
    {
      id: `task_${record.id}_40`,
      title: '避开禁忌话题',
      detail: (record.tabooTopics || []).join('、') || '避免隐私、敏感争议和客户明确不希望讨论的话题',
      role: '商务助理',
      status: 'pending',
      sortOrder: 40
    },
    {
      id: `task_${record.id}_50`,
      title: '按角色分工执行现场协同',
      detail: roleDetail,
      role: '商务助理',
      status: 'pending',
      sortOrder: 50
    }
  ].filter(task => task.detail);
}

function localRiskDetect(text: string): RiskDetectionResult {
  const hits = sensitiveWords
    .filter(item => item.status === 'active' && text.includes(item.keyword))
    .map(item => ({
      keyword: item.keyword,
      category: item.category,
      level: item.level,
      sample: text.slice(Math.max(0, text.indexOf(item.keyword) - 8), text.indexOf(item.keyword) + item.keyword.length + 8)
    }));
  const phoneHit = text.match(/1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}/);
  if (phoneHit) {
    hits.push({ keyword: phoneHit[0], category: 'public_contact', level: 'high', sample: phoneHit[0] });
  }
  const level = hits.some(item => item.level === 'critical') ? 'critical' : hits.some(item => item.level === 'high') ? 'high' : hits.length ? 'medium' : 'low';
  return {
    safe: hits.length === 0,
    level,
    hits,
    sanitizedText: hits.reduce((content, hit) => content.replaceAll(hit.keyword, '*'.repeat(Math.max(2, hit.keyword.length))), text)
  };
}

function adaptAssistant(item: any): AssistantRecord {
  return {
    id: item.id,
    assistantNo: item.assistantNo,
    workName: item.publicProfile?.workName || item.assistantNo,
    city: item.city,
    status: item.status,
    publicProfileStatus: item.publicProfile?.profileStatus || 'pending',
    publicProfile: {
      avatarUrl: item.publicProfile?.avatarUrl || '',
      imageAuditStatus: item.publicProfile?.imageAuditStatus || 'pending',
      styleTags: item.publicProfile?.styleTags || [],
      sceneSkills: item.publicProfile?.sceneSkills || [],
      businessSkills: item.publicProfile?.businessSkills || [],
      publicIntro: item.publicProfile?.publicIntro || ''
    },
    internalProfile: {
      realName: item.realName || item.internalProfile?.legalName || '',
      phoneMasked: item.internalProfile?.phone || item.phone || '',
      idNumberMasked: item.internalProfile?.idNumberMasked || '',
      internalTags: item.internalLevel ? [item.internalLevel] : [],
      internalNote: item.internalProfile?.managerPrivateNote || '',
      trainingRecords: item.internalProfile?.trainingNotes ? [item.internalProfile.trainingNotes] : []
    }
  };
}

const registry: Record<string, BasicRecord[]> = {
  customers,
  leads,
  availability,
  matching,
  riskCases,
  cmsPages,
  analytics,
  settings,
  settlements
};

export const apiClient = {
  async login(input: { username: string; password: string }): Promise<{ token: string; user: UserProfile }> {
    if (!USE_MOCK) {
      const { data } = await http.post('/auth/admin/login', input);
      return data;
    }
    prependAudit('auth.login', 'user', currentUser.id, { username: input.username });
    return wait({ token: 'mock_admin_token', user: currentUser });
  },

  async me(): Promise<UserProfile> {
    if (!USE_MOCK) {
      const { data } = await http.get('/auth/me');
      return data;
    }
    return wait(currentUser);
  },

  async listBasic(moduleKey: string, query: PageQuery): Promise<PageResult<BasicRecord>> {
    if (!USE_MOCK) {
      const { data } = await http.get(`/admin/${moduleKey}`, { params: query });
      return data;
    }
    return wait(page(registry[moduleKey] || [], query));
  },

  async updateBasic(moduleKey: string, id: string, patch: Partial<BasicRecord>): Promise<BasicRecord> {
    if (!USE_MOCK) {
      const { data } = await http.patch(`/admin/${moduleKey}/${id}`, patch);
      return data;
    }
    const list = registry[moduleKey] || [];
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) {
      list[index] = { ...list[index], ...patch };
    } else {
      list.unshift(patch as BasicRecord);
    }
    prependAudit(`${moduleKey}.update`, moduleKey, id, patch);
    return wait(index >= 0 ? list[index] : list[0]);
  },

  async listBookings(query: PageQuery): Promise<PageResult<BookingRecord>> {
    if (!USE_MOCK) {
      const { data } = await http.get('/admin/bookings', { params: query });
      return { list: data.items || data.list || [], total: data.total || 0 };
    }
    return wait(page(bookings, query));
  },

  async updateBookingStatus(id: string, status: string, note?: string): Promise<BookingRecord> {
    if (!USE_MOCK) {
      const statusMap: Record<string, string> = {
        pending_payment: 'deposit_pending',
        pending_match: 'matching',
        matched: 'confirmed',
        brief_preparing: 'prep',
        ready_for_service: 'prep',
        in_service: 'executing',
        completed: 'completed',
        cancelled: 'cancelled',
        risk_hold: 'exception'
      };
      const { data } = await http.patch(`/admin/orders/${id}/status`, {
        toStatus: statusMap[status] || status,
        trigger: status === 'risk_hold' ? 'admin_exception' : 'admin_override',
        actorType: 'admin',
        reason: note
      });
      return data;
    }
    const item = bookings.find(record => record.id === id);
    if (!item) throw new Error('订单不存在');
    const from = item.status;
    item.status = status;
    item.timeline.push({
      status,
      title: `状态变更为 ${status}`,
      time: new Date().toLocaleString(),
      operator: currentUser.name,
      note
    });
    prependAudit('booking.update_status', 'booking', id, { from, to: status, note });
    return wait(item);
  },

  async listAssistants(query: PageQuery): Promise<PageResult<AssistantRecord>> {
    if (!USE_MOCK) {
      const { data } = await http.get('/admin/assistants', { params: query });
      const items = (data.items || []).map(adaptAssistant);
      return { list: items, total: data.total || 0 };
    }
    return wait(page(assistants, query));
  },

  async createAssistant(input: Partial<AssistantRecord>): Promise<AssistantRecord> {
    if (!USE_MOCK) {
      const { data: created } = await http.post('/admin/assistants', {
        realName: input.internalProfile?.realName,
        phone: input.internalProfile?.phoneMasked,
        city: input.city,
        status: input.status || 'pending',
        managerPrivateNote: input.internalProfile?.internalNote
      });
      if (input.workName || input.publicProfile?.publicIntro) {
        await http.put(`/admin/assistants/${created.id}/public-profile`, {
          workName: input.workName || created.assistantNo,
          city: input.city || created.city,
          avatarUrl: input.publicProfile?.avatarUrl,
          styleTags: input.publicProfile?.styleTags || [],
          sceneSkills: input.publicProfile?.sceneSkills || [],
          businessSkills: input.publicProfile?.businessSkills || [],
          publicIntro: input.publicProfile?.publicIntro || ''
        });
      }
      const { data } = await http.get(`/admin/assistants/${created.id}`);
      return adaptAssistant(data);
    }
    const record: AssistantRecord = {
      id: `as_${Date.now()}`,
      assistantNo: `BA-${String(Date.now()).slice(-6)}`,
      workName: input.workName || '待命名助理',
      city: input.city || '上海',
      status: input.status || 'pending',
      publicProfileStatus: 'pending',
      publicProfile: {
        avatarUrl: input.publicProfile?.avatarUrl || '',
        imageAuditStatus: 'pending',
        styleTags: input.publicProfile?.styleTags || [],
        sceneSkills: input.publicProfile?.sceneSkills || [],
        businessSkills: input.publicProfile?.businessSkills || [],
        publicIntro: input.publicProfile?.publicIntro || ''
      },
      internalProfile: {
        realName: input.internalProfile?.realName || '',
        phoneMasked: input.internalProfile?.phoneMasked || '',
        idNumberMasked: input.internalProfile?.idNumberMasked || '',
        internalTags: input.internalProfile?.internalTags || [],
        internalNote: input.internalProfile?.internalNote || '',
        trainingRecords: input.internalProfile?.trainingRecords || []
      }
    };
    assistants.unshift(record);
    prependAudit('assistant.create', 'assistant', record.id, record as unknown as Record<string, unknown>);
    return wait(record);
  },

  async updateAssistant(id: string, patch: Partial<AssistantRecord>): Promise<AssistantRecord> {
    if (!USE_MOCK) {
      if (patch.internalProfile) {
        await http.patch(`/admin/assistants/${id}/internal-profile`, {
          realName: patch.internalProfile.realName,
          phone: patch.internalProfile.phoneMasked,
          idNumberMasked: patch.internalProfile.idNumberMasked,
          managerPrivateNote: patch.internalProfile.internalNote,
          trainingNotes: patch.internalProfile.trainingRecords?.join('\n'),
          city: patch.city,
          status: patch.status
        });
      }
      if (patch.publicProfile || patch.workName || patch.city) {
        await http.put(`/admin/assistants/${id}/public-profile`, {
          workName: patch.workName || '待命名助理',
          city: patch.city || '',
          avatarUrl: patch.publicProfile?.avatarUrl,
          styleTags: patch.publicProfile?.styleTags || [],
          sceneSkills: patch.publicProfile?.sceneSkills || [],
          businessSkills: patch.publicProfile?.businessSkills || [],
          publicIntro: patch.publicProfile?.publicIntro || ''
        });
      }
      const { data } = await http.get(`/admin/assistants/${id}`);
      return adaptAssistant(data);
    }
    const index = assistants.findIndex(item => item.id === id);
    if (index < 0) throw new Error('助理不存在');
    assistants[index] = { ...assistants[index], ...patch };
    prependAudit('assistant.update', 'assistant', id, patch as Record<string, unknown>);
    return wait(assistants[index]);
  },

  async uploadAssistantPhoto(id: string, file: File): Promise<Record<string, unknown>> {
    if (!USE_MOCK) {
      const form = new FormData();
      form.append('file', file);
      form.append('photoType', 'profile');
      const { data } = await http.post(`/admin/assistants/${id}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    }
    prependAudit('assistant.photo.upload', 'assistant', id, { fileName: file.name });
    return wait({ id: `photo_${Date.now()}`, url: URL.createObjectURL(file), imageAuditStatus: 'pending' });
  },

  async listMealBriefs(query: PageQuery): Promise<PageResult<MealBriefRecord>> {
    if (!USE_MOCK) {
      const { data } = await http.get('/admin/meal-briefs', { params: query });
      return data;
    }
    return wait(page(mealBriefs, query));
  },

  async createMealBrief(input: Partial<MealBriefRecord> & { bookingNo: string }): Promise<MealBriefRecord> {
    if (!USE_MOCK) {
      const { data } = await http.post('/admin/meal-briefs', input);
      return data;
    }
    const record: MealBriefRecord = {
      id: `brief_${Date.now()}`,
      orderId: input.orderId || `booking_${Date.now()}`,
      bookingNo: input.bookingNo,
      customerName: input.customerName || '待补充客户',
      sceneName: input.sceneName || '商务宴请',
      city: input.city || '上海',
      serviceTime: input.serviceTime || '',
      assistantCount: input.assistantCount || 1,
      status: 'draft',
      banquetTheme: input.banquetTheme || '',
      customerBackground: input.customerBackground || '',
      diningPurpose: input.diningPurpose || '',
      attendeeCount: input.attendeeCount || 1,
      guestIdentities: input.guestIdentities || [],
      atmosphereNeeds: input.atmosphereNeeds || '',
      tabooTopics: input.tabooTopics || [],
      recommendedTopics: input.recommendedTopics || [],
      dressCode: input.dressCode || '',
      roleAssignments: input.roleAssignments || [],
      attentionPoints: input.attentionPoints || [],
      managerPrivateNote: input.managerPrivateNote || '',
      assistantVisibleBrief: input.assistantVisibleBrief || composeAssistantBrief(input),
      tasks: [],
      updatedAt: new Date().toLocaleString()
    };
    mealBriefs.unshift(record);
    prependAudit('meal_brief.create', 'meal_brief', record.id, record as unknown as Record<string, unknown>);
    return wait(record);
  },

  async updateMealBrief(id: string, patch: Partial<MealBriefRecord>): Promise<MealBriefRecord> {
    if (!USE_MOCK) {
      const { data } = await http.patch(`/admin/meal-briefs/${id}`, patch);
      return data;
    }
    const index = mealBriefs.findIndex(item => item.id === id);
    if (index < 0) throw new Error('brief 不存在');
    mealBriefs[index] = { ...mealBriefs[index], ...patch, updatedAt: new Date().toLocaleString() };
    prependAudit('meal_brief.update', 'meal_brief', id, patch as Record<string, unknown>);
    return wait(mealBriefs[index]);
  },

  async submitMealBrief(id: string): Promise<MealBriefRecord> {
    if (!USE_MOCK) {
      const { data } = await http.post(`/admin/meal-briefs/${id}/submit`, {});
      return data;
    }
    const item = mealBriefs.find(record => record.id === id);
    if (!item) throw new Error('brief 不存在');
    item.status = 'submitted';
    item.submittedBy = currentUser.name;
    item.submittedAt = new Date().toLocaleString();
    item.updatedAt = item.submittedAt;
    prependAudit('meal_brief.submit', 'meal_brief', id, { submittedBy: currentUser.name });
    return wait(item);
  },

  async approveMealBrief(id: string): Promise<MealBriefRecord> {
    if (!USE_MOCK) {
      const { data } = await http.post(`/admin/meal-briefs/${id}/approve`, {});
      return data;
    }
    const item = mealBriefs.find(record => record.id === id);
    if (!item) throw new Error('brief 不存在');
    item.status = 'approved';
    item.approvedBy = currentUser.name;
    item.approvedAt = new Date().toLocaleString();
    item.updatedAt = item.approvedAt;
    prependAudit('meal_brief.approve', 'meal_brief', id, { approvedBy: currentUser.name });
    return wait(item);
  },

  async generateMealBriefTasks(id: string): Promise<NonNullable<MealBriefRecord['tasks']>> {
    if (!USE_MOCK) {
      const { data } = await http.post(`/admin/meal-briefs/${id}/generate-tasks`);
      return data;
    }
    const item = mealBriefs.find(record => record.id === id);
    if (!item) throw new Error('brief 不存在');
    item.tasks = buildMealBriefTasks(item);
    item.updatedAt = new Date().toLocaleString();
    prependAudit('meal_brief.generate_tasks', 'meal_brief', id, { count: item.tasks.length });
    return wait(item.tasks);
  },

  async scheduleMealBriefReminder(id: string, remindAt: string): Promise<MealBriefRecord> {
    if (!USE_MOCK) {
      await http.post(`/admin/meal-briefs/${id}/reminders`, { remindAt, channel: 'staff_mp' });
      const { data } = await http.get(`/admin/meal-briefs/${id}`);
      return data;
    }
    const item = mealBriefs.find(record => record.id === id);
    if (!item) throw new Error('brief 不存在');
    item.reminderAt = remindAt;
    item.updatedAt = new Date().toLocaleString();
    prependAudit('meal_brief.schedule_reminder', 'meal_brief', id, { remindAt });
    return wait(item);
  },

  async reviewMealBrief(id: string, review: NonNullable<MealBriefRecord['review']>): Promise<MealBriefRecord> {
    if (!USE_MOCK) {
      const { data } = await http.post(`/admin/meal-briefs/${id}/review`, review);
      return data;
    }
    const item = mealBriefs.find(record => record.id === id);
    if (!item) throw new Error('brief 不存在');
    item.status = 'reviewed';
    item.review = review;
    item.updatedAt = new Date().toLocaleString();
    prependAudit('meal_brief.review', 'meal_brief', id, review as Record<string, unknown>);
    return wait(item);
  },

  async listFinance(query: PageQuery): Promise<PageResult<FinanceRecord>> {
    return wait(page(financeRecords, query));
  },

  async listApprovals(query: PageQuery): Promise<PageResult<ApprovalRecord>> {
    return wait(page(approvals, query));
  },

  async decideApproval(id: string, action: 'approved' | 'rejected', remark: string): Promise<ApprovalRecord> {
    const item = approvals.find(record => record.id === id);
    if (!item) throw new Error('审批不存在');
    item.status = action;
    item.remark = remark;
    prependAudit(`approval.${action}`, 'approval', id, { remark });
    return wait(item);
  },

  async listRoles() {
    return wait(roles);
  },

  async updateRolePermissions(id: string, permissions: string[]) {
    const item = roles.find(role => role.id === id);
    if (!item) throw new Error('角色不存在');
    item.permissions = permissions;
    prependAudit('role.update_permissions', 'role', id, { permissions });
    return wait(item);
  },

  async listAuditLogs(query: PageQuery): Promise<PageResult<AuditLogRecord>> {
    return wait(page(auditLogs, query));
  },

  async writeAudit(action: string, resourceType: string, resourceId: string, metadata?: Record<string, unknown>) {
    prependAudit(action, resourceType, resourceId, metadata);
    return wait(true);
  },

  async getRiskReport(): Promise<RiskReportSummary> {
    if (!USE_MOCK) {
      const { data } = await http.get('/admin/risk/report');
      return data;
    }
    return wait(riskReport);
  },

  async detectRiskText(text: string): Promise<RiskDetectionResult> {
    if (!USE_MOCK) {
      const { data } = await http.post('/admin/risk/detect', { text });
      return data;
    }
    const result = localRiskDetect(text);
    prependAudit('risk.detect', 'risk_event', `detect_${Date.now()}`, { level: result.level, hits: result.hits.length });
    return wait(result);
  },

  async listSensitiveWords(query: PageQuery): Promise<PageResult<SensitiveWordRecord>> {
    if (!USE_MOCK) {
      const { data } = await http.get('/admin/risk/sensitive-words', { params: query });
      return data;
    }
    return wait(page(sensitiveWords, query));
  },

  async saveSensitiveWord(id: string | undefined, patch: Partial<SensitiveWordRecord>): Promise<SensitiveWordRecord> {
    if (!USE_MOCK) {
      const { data } = id ? await http.patch(`/admin/risk/sensitive-words/${id}`, patch) : await http.post('/admin/risk/sensitive-words', patch);
      return data;
    }
    const index = sensitiveWords.findIndex(item => item.id === id);
    const record = {
      id: id || `sw_${Date.now()}`,
      keyword: patch.keyword || '',
      category: patch.category || 'boundary_violation',
      level: patch.level || 'medium',
      status: patch.status || 'active',
      hitCount: patch.hitCount || 0,
      note: patch.note,
      updatedAt: new Date().toLocaleString()
    };
    if (index >= 0) sensitiveWords[index] = { ...sensitiveWords[index], ...record };
    else sensitiveWords.unshift(record);
    prependAudit('risk_sensitive_word.save', 'risk_sensitive_word', record.id, record);
    return wait(index >= 0 ? sensitiveWords[index] : sensitiveWords[0]);
  },

  async listProfileReviews(query: PageQuery): Promise<PageResult<PublicProfileReviewRecord>> {
    if (!USE_MOCK) {
      const { data } = await http.get('/admin/risk/profile-reviews', { params: query });
      return data;
    }
    return wait(page(profileReviews, query));
  },

  async decideProfileReview(id: string, status: string, imageAuditStatus: string, rejectionReason?: string): Promise<PublicProfileReviewRecord> {
    if (!USE_MOCK) {
      const { data } = await http.post(`/admin/risk/profile-reviews/${id}/decision`, { status, imageAuditStatus, rejectionReason });
      return data;
    }
    const item = profileReviews.find(record => record.id === id);
    if (!item) throw new Error('审核记录不存在');
    item.status = status;
    item.imageAuditStatus = imageAuditStatus;
    item.rejectionReason = rejectionReason;
    item.updatedAt = new Date().toLocaleString();
    prependAudit('public_profile_review.decision', 'public_profile_review', id, { status, imageAuditStatus, rejectionReason });
    return wait(item);
  },

  async listComplaints(query: PageQuery): Promise<PageResult<ComplaintRecord>> {
    if (!USE_MOCK) {
      const { data } = await http.get('/admin/risk/complaints', { params: query });
      return data;
    }
    return wait(page(complaints, query));
  },

  async updateComplaint(id: string, status: string, resolution?: string): Promise<ComplaintRecord> {
    if (!USE_MOCK) {
      const { data } = await http.patch(`/admin/risk/complaints/${id}`, { status, resolution });
      return data;
    }
    const item = complaints.find(record => record.id === id);
    if (!item) throw new Error('投诉不存在');
    item.status = status;
    item.resolution = resolution;
    prependAudit('complaint.update', 'complaint', id, { status, resolution });
    return wait(item);
  },

  async listBlacklist(query: PageQuery): Promise<PageResult<BlacklistRecord>> {
    if (!USE_MOCK) {
      const { data } = await http.get('/admin/risk/blacklist', { params: query });
      return data;
    }
    return wait(page(blacklistEntries, query));
  },

  async saveBlacklist(patch: Partial<BlacklistRecord>): Promise<BlacklistRecord> {
    if (!USE_MOCK) {
      const { data } = await http.post('/admin/risk/blacklist', patch);
      return data;
    }
    const record: BlacklistRecord = {
      id: `bl_${Date.now()}`,
      subjectType: patch.subjectType || 'customer',
      subjectName: patch.subjectName || '',
      reason: patch.reason || '',
      status: patch.status || 'active',
      expiredAt: patch.expiredAt,
      createdAt: new Date().toLocaleString()
    };
    blacklistEntries.unshift(record);
    prependAudit('blacklist.create', 'blacklist_entry', record.id, record as unknown as Record<string, unknown>);
    return wait(record);
  },

  async listOrderExceptions(query: PageQuery): Promise<PageResult<OrderExceptionRecord>> {
    if (!USE_MOCK) {
      const { data } = await http.get('/admin/risk/order-exceptions', { params: query });
      return data;
    }
    return wait(page(orderExceptions, query));
  },

  async resolveOrderException(id: string, status: string): Promise<OrderExceptionRecord> {
    if (!USE_MOCK) {
      const { data } = await http.patch(`/admin/risk/order-exceptions/${id}`, { status });
      return data;
    }
    const item = orderExceptions.find(record => record.id === id);
    if (!item) throw new Error('异常单不存在');
    item.status = status;
    prependAudit('order_exception.update', 'order_exception_case', id, { status });
    return wait(item);
  }
};
