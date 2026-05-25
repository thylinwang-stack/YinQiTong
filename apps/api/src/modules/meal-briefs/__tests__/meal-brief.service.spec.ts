import { BusinessException } from '@/common/errors/business.exception';
import { MealBriefService } from '../meal-brief.service';
import { MealBriefStatus } from '../meal-brief.enums';
import { CreateMealBriefDto, ServiceReviewDto, UpsertMealBriefDto } from '../dto/meal-brief.dto';
import { MealBriefRecord, MealBriefRepository, MealBriefTaskRecord } from '../repositories/meal-brief.repository';

class InMemoryMealBriefRepository implements MealBriefRepository {
  briefs = new Map<string, MealBriefRecord>();
  tasks = new Map<string, MealBriefTaskRecord[]>();
  auditLogs: unknown[] = [];
  statusLogs: unknown[] = [];

  transaction<T>(handler: (repo: MealBriefRepository) => Promise<T>): Promise<T> {
    return handler(this);
  }

  list(): Promise<{ list: MealBriefRecord[]; total: number }> {
    const list = [...this.briefs.values()];
    return Promise.resolve({ list, total: list.length });
  }

  findById(id: string): Promise<MealBriefRecord | null> {
    return Promise.resolve(this.briefs.get(id) || null);
  }

  findByOrderId(orderId: string): Promise<MealBriefRecord | null> {
    return Promise.resolve([...this.briefs.values()].find(item => item.orderId === orderId) || null);
  }

  create(input: CreateMealBriefDto): Promise<MealBriefRecord> {
    const brief: MealBriefRecord = {
      id: `brief_${this.briefs.size + 1}`,
      orderId: input.orderId,
      status: MealBriefStatus.Draft,
      banquetTheme: input.banquetTheme,
      customerBackground: input.customerBackground,
      diningPurpose: input.diningPurpose,
      attendeeCount: input.attendeeCount,
      guestIdentities: input.guestIdentities || [],
      atmosphereNeeds: input.atmosphereNeeds,
      tabooTopics: input.tabooTopics || [],
      recommendedTopics: input.recommendedTopics || [],
      dressCode: input.dressCode,
      roleAssignments: input.roleAssignments || [],
      attentionPoints: input.attentionPoints || [],
      managerPrivateNote: input.managerPrivateNote,
      assistantVisibleBrief: input.assistantVisibleBrief || ''
    };
    this.briefs.set(brief.id, brief);
    return Promise.resolve(brief);
  }

  update(id: string, input: UpsertMealBriefDto): Promise<MealBriefRecord> {
    const current = this.briefs.get(id);
    if (!current) throw new Error('not found');
    const next = { ...current, ...input };
    this.briefs.set(id, next);
    return Promise.resolve(next);
  }

  updateStatus(id: string, status: MealBriefStatus, patch: Record<string, unknown> = {}): Promise<MealBriefRecord> {
    const current = this.briefs.get(id);
    if (!current) throw new Error('not found');
    const next = { ...current, ...patch, status };
    this.briefs.set(id, next);
    return Promise.resolve(next);
  }

  replaceTasks(mealBriefId: string, tasks: Array<{ title: string; detail?: string; role?: string; sortOrder: number }>): Promise<MealBriefTaskRecord[]> {
    const records = tasks.map((task, index) => ({
      id: `task_${index + 1}`,
      mealBriefId,
      status: 'pending',
      ...task
    }));
    this.tasks.set(mealBriefId, records);
    return Promise.resolve(records);
  }

  listTasks(mealBriefId: string): Promise<MealBriefTaskRecord[]> {
    return Promise.resolve(this.tasks.get(mealBriefId) || []);
  }

  updateTaskStatus(mealBriefId: string, taskId: string, status: string): Promise<MealBriefTaskRecord> {
    const records = this.tasks.get(mealBriefId) || [];
    const index = records.findIndex(task => task.id === taskId);
    if (index < 0) throw new Error('task not found');
    records[index] = { ...records[index], status };
    this.tasks.set(mealBriefId, records);
    return Promise.resolve(records[index]);
  }

  createReminder(): Promise<void> {
    return Promise.resolve();
  }

  markReminderSent(): Promise<void> {
    return Promise.resolve();
  }

  upsertReview(_mealBriefId: string, _input: ServiceReviewDto): Promise<void> {
    return Promise.resolve();
  }

  createStatusLog(input: unknown): Promise<void> {
    this.statusLogs.push(input);
    return Promise.resolve();
  }

  createAuditLog(input: unknown): Promise<void> {
    this.auditLogs.push(input);
    return Promise.resolve();
  }
}

describe('MealBriefService', () => {
  let repo: InMemoryMealBriefRepository;
  let service: MealBriefService;

  beforeEach(() => {
    repo = new InMemoryMealBriefRepository();
    service = new MealBriefService(repo);
  });

  it('creates brief and composes assistant visible brief', async () => {
    const brief = await service.create({
      orderId: '11111111-1111-1111-1111-111111111111',
      banquetTheme: '重要客户晚宴',
      customerBackground: '客户为外地到访企业负责人',
      diningPurpose: '建立初步信任',
      attendeeCount: 6,
      recommendedTopics: ['城市印象', '行业趋势'],
      tabooTopics: ['价格底线'],
      dressCode: '商务正式'
    });

    expect(brief.assistantVisibleBrief).toContain('重要客户晚宴');
    expect(brief.managerPrivateNote).toBeUndefined();
    expect(repo.auditLogs).toHaveLength(1);
    expect(repo.statusLogs).toHaveLength(1);
  });

  it('requires key fields before submit', async () => {
    const brief = await service.create({
      orderId: '11111111-1111-1111-1111-111111111111',
      banquetTheme: '晚宴'
    });

    await expect(service.submit(brief.id, {
      submittedBy: '22222222-2222-2222-2222-222222222222'
    })).rejects.toThrow(BusinessException);
  });

  it('runs submit approve assistant confirm flow', async () => {
    const brief = await service.create({
      orderId: '11111111-1111-1111-1111-111111111111',
      banquetTheme: '重要客户晚宴',
      customerBackground: '客户背景',
      diningPurpose: '项目沟通',
      attendeeCount: 5,
      assistantVisibleBrief: '按 brief 执行'
    });

    await service.submit(brief.id, { submittedBy: '22222222-2222-2222-2222-222222222222' });
    await service.approve(brief.id, { approvedBy: '33333333-3333-3333-3333-333333333333' });
    const confirmed = await service.assistantConfirm(brief.id, { assistantId: '44444444-4444-4444-4444-444444444444' });

    expect(confirmed.status).toBe(MealBriefStatus.AssistantConfirmed);
    expect(repo.statusLogs).toHaveLength(4);
  });

  it('generates assistant task list after submit', async () => {
    const brief = await service.create({
      orderId: '11111111-1111-1111-1111-111111111111',
      banquetTheme: '重要客户晚宴',
      customerBackground: '客户背景',
      diningPurpose: '项目沟通',
      attendeeCount: 5,
      assistantVisibleBrief: '注意分寸',
      recommendedTopics: ['城市印象'],
      tabooTopics: ['客户隐私']
    });
    await service.submit(brief.id, { submittedBy: '22222222-2222-2222-2222-222222222222' });

    const tasks = await service.generateAssistantTasks(brief.id);

    expect(tasks.length).toBeGreaterThanOrEqual(4);
    expect(tasks[0].title).toBe('服务前阅读餐前 brief');
  });

  it('hides manager private note from assistant brief', async () => {
    const brief = await service.create({
      orderId: '11111111-1111-1111-1111-111111111111',
      banquetTheme: '晚宴',
      customerBackground: '客户背景',
      diningPurpose: '沟通',
      attendeeCount: 4,
      assistantVisibleBrief: '助理可见',
      managerPrivateNote: '仅内部可见'
    });

    const assistantBrief = await service.getAssistantBrief(brief.id);

    expect(assistantBrief.assistantVisibleBrief).toBe('助理可见');
    expect(JSON.stringify(assistantBrief)).not.toContain('仅内部可见');
  });

  it('allows assistant to check generated task', async () => {
    const brief = await service.create({
      orderId: '11111111-1111-1111-1111-111111111111',
      banquetTheme: '晚宴',
      customerBackground: '客户背景',
      diningPurpose: '沟通',
      attendeeCount: 4,
      assistantVisibleBrief: '助理可见'
    });
    await service.submit(brief.id, { submittedBy: '22222222-2222-2222-2222-222222222222' });
    await service.approve(brief.id, { approvedBy: '33333333-3333-3333-3333-333333333333' });
    const tasks = await service.generateAssistantTasks(brief.id);

    const updated = await service.updateAssistantTask(brief.id, tasks[0].id, { checked: true });

    expect(updated[0].status).toBe('done');
  });

  it('stores assistant feedback for post-service review', async () => {
    const brief = await service.create({
      orderId: '11111111-1111-1111-1111-111111111111',
      banquetTheme: '晚宴',
      customerBackground: '客户背景',
      diningPurpose: '沟通',
      attendeeCount: 4,
      assistantVisibleBrief: '助理可见'
    });
    await service.submit(brief.id, { submittedBy: '22222222-2222-2222-2222-222222222222' });
    await service.approve(brief.id, { approvedBy: '33333333-3333-3333-3333-333333333333' });
    await service.assistantConfirm(brief.id, { assistantId: '44444444-4444-4444-4444-444444444444' });

    await service.submitAssistantFeedback(brief.id, {
      assistantFeedback: '现场沟通顺畅，客户对城市话题反馈积极。',
      assistantId: '44444444-4444-4444-4444-444444444444'
    });

    expect(repo.auditLogs.some(item => JSON.stringify(item).includes('assistant_feedback'))).toBe(true);
  });
});
