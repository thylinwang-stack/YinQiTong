import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessException } from '@/common/errors/business.exception';
import {
  ApproveMealBriefDto,
  AssistantFeedbackDto,
  AssistantConfirmBriefDto,
  CreateMealBriefDto,
  ListMealBriefQueryDto,
  ScheduleReminderDto,
  ServiceReviewDto,
  SubmitMealBriefDto,
  UpdateMealBriefTaskDto,
  UpsertMealBriefDto
} from './dto/meal-brief.dto';
import { MealBriefActorType, MealBriefStatus, MEAL_BRIEF_TRANSITIONS } from './meal-brief.enums';
import {
  MEAL_BRIEF_REPOSITORY,
  MealBriefRecord,
  MealBriefRepository,
  MealBriefRoleAssignment,
  MealBriefTaskRecord
} from './repositories/meal-brief.repository';

@Injectable()
export class MealBriefService {
  constructor(
    @Inject(MEAL_BRIEF_REPOSITORY)
    private readonly repository: MealBriefRepository
  ) {}

  create(dto: CreateMealBriefDto): Promise<MealBriefRecord> {
    return this.repository.transaction(async repo => {
      const existed = await repo.findByOrderId(dto.orderId);
      if (existed) {
        throw new BusinessException('MEAL_BRIEF_EXISTS', '该订单已存在餐前 brief');
      }

      const brief = await repo.create({
        ...dto,
        assistantVisibleBrief: dto.assistantVisibleBrief || this.composeAssistantVisibleBrief(dto)
      });
      await this.statusLog(repo, brief.id, null, MealBriefStatus.Draft, 'create', MealBriefActorType.CustomerService);
      await this.audit(repo, 'meal_brief.create', brief.id, undefined, brief, MealBriefActorType.CustomerService);
      return brief;
    });
  }

  list(query: ListMealBriefQueryDto) {
    return this.repository.list(query);
  }

  update(id: string, dto: UpsertMealBriefDto): Promise<MealBriefRecord> {
    return this.repository.transaction(async repo => {
      const before = await this.findOrThrow(repo, id);
      if (![MealBriefStatus.Draft, MealBriefStatus.Submitted].includes(before.status)) {
        throw new BusinessException('MEAL_BRIEF_LOCKED', '已审核或已确认的 brief 不允许直接编辑');
      }

      const next = await repo.update(id, {
        ...dto,
        assistantVisibleBrief: dto.assistantVisibleBrief || before.assistantVisibleBrief || this.composeAssistantVisibleBrief({ ...before, ...dto })
      });
      await this.audit(repo, 'meal_brief.update', id, before, next, MealBriefActorType.CustomerService);
      return next;
    });
  }

  submit(id: string, dto: SubmitMealBriefDto): Promise<MealBriefRecord> {
    return this.repository.transaction(async repo => {
      const brief = await this.findOrThrow(repo, id);
      this.assertTransition(brief.status, MealBriefStatus.Submitted);
      this.assertBriefReadyForSubmit(brief);

      const next = await repo.updateStatus(id, MealBriefStatus.Submitted, {
        submittedBy: dto.submittedBy,
        submittedAt: new Date()
      });
      await this.statusLog(repo, id, brief.status, next.status, 'submit', MealBriefActorType.CustomerService, dto.submittedBy);
      await this.audit(repo, 'meal_brief.submit', id, { status: brief.status }, { status: next.status }, MealBriefActorType.CustomerService, dto.submittedBy);
      return next;
    });
  }

  approve(id: string, dto: ApproveMealBriefDto): Promise<MealBriefRecord> {
    return this.repository.transaction(async repo => {
      const brief = await this.findOrThrow(repo, id);
      this.assertTransition(brief.status, MealBriefStatus.Approved);

      const next = await repo.updateStatus(id, MealBriefStatus.Approved, {
        approvedBy: dto.approvedBy,
        approvedAt: new Date()
      });
      await this.statusLog(repo, id, brief.status, next.status, 'approve', MealBriefActorType.Operations, dto.approvedBy);
      await this.audit(repo, 'meal_brief.approve', id, { status: brief.status }, { status: next.status }, MealBriefActorType.Operations, dto.approvedBy);
      return next;
    });
  }

  assistantConfirm(id: string, dto: AssistantConfirmBriefDto): Promise<MealBriefRecord> {
    return this.repository.transaction(async repo => {
      const brief = await this.findOrThrow(repo, id);
      this.assertTransition(brief.status, MealBriefStatus.AssistantConfirmed);

      const next = await repo.updateStatus(id, MealBriefStatus.AssistantConfirmed, {
        assistantConfirmedBy: dto.assistantId,
        assistantConfirmedAt: new Date()
      });
      await this.statusLog(repo, id, brief.status, next.status, 'assistant_confirm', MealBriefActorType.Assistant, dto.assistantId);
      await this.audit(repo, 'meal_brief.assistant_confirm', id, { status: brief.status }, { status: next.status }, MealBriefActorType.Assistant, dto.assistantId);
      return next;
    });
  }

  async getManagerBrief(id: string): Promise<MealBriefRecord & { tasks: MealBriefTaskRecord[] }> {
    const brief = await this.repository.transaction(repo => this.findOrThrow(repo, id));
    const tasks = await this.repository.transaction(repo => repo.listTasks(id));
    return { ...brief, tasks };
  }

  async getAssistantBrief(id: string): Promise<{
    id: string;
    orderId: string;
    status: MealBriefStatus;
    banquetTheme?: string | null;
    attendeeCount?: number | null;
    dressCode?: string | null;
    assistantVisibleBrief: string;
    recommendedTopics: string[];
    tabooTopics: string[];
    roleAssignments: MealBriefRoleAssignment[];
    attentionPoints: string[];
    tasks: MealBriefTaskRecord[];
  }> {
    const brief = await this.repository.transaction(repo => this.findOrThrow(repo, id));
    const tasks = await this.repository.transaction(repo => repo.listTasks(id));
    return {
      id: brief.id,
      orderId: brief.orderId,
      status: brief.status,
      banquetTheme: brief.banquetTheme,
      attendeeCount: brief.attendeeCount,
      dressCode: brief.dressCode,
      assistantVisibleBrief: brief.assistantVisibleBrief,
      recommendedTopics: brief.recommendedTopics,
      tabooTopics: brief.tabooTopics,
      roleAssignments: brief.roleAssignments,
      attentionPoints: brief.attentionPoints,
      tasks
    };
  }

  updateAssistantTask(id: string, taskId: string, dto: UpdateMealBriefTaskDto): Promise<MealBriefTaskRecord[]> {
    return this.repository.transaction(async repo => {
      const brief = await this.findOrThrow(repo, id);
      if (![MealBriefStatus.Approved, MealBriefStatus.AssistantConfirmed, MealBriefStatus.ReminderSent].includes(brief.status)) {
        throw new BusinessException('MEAL_BRIEF_TASK_CHECK_STATUS_INVALID', 'brief 审核通过后才能勾选任务');
      }
      await repo.updateTaskStatus(id, taskId, dto.checked ? 'done' : 'pending');
      const tasks = await repo.listTasks(id);
      await this.audit(repo, 'meal_brief.task_update', id, undefined, { taskId, checked: dto.checked }, MealBriefActorType.Assistant);
      return tasks;
    });
  }

  submitAssistantFeedback(id: string, dto: AssistantFeedbackDto): Promise<void> {
    return this.repository.transaction(async repo => {
      const brief = await this.findOrThrow(repo, id);
      if (![MealBriefStatus.AssistantConfirmed, MealBriefStatus.ReminderSent, MealBriefStatus.Reviewed].includes(brief.status)) {
        throw new BusinessException('MEAL_BRIEF_FEEDBACK_STATUS_INVALID', '助理确认后才能提交服务反馈');
      }
      await repo.upsertReview(id, {
        assistantFeedback: dto.assistantFeedback,
        createdBy: dto.assistantId
      });
      await this.audit(repo, 'meal_brief.assistant_feedback', id, undefined, { assistantFeedback: dto.assistantFeedback }, MealBriefActorType.Assistant, dto.assistantId);
    });
  }

  generateAssistantTasks(id: string): Promise<MealBriefTaskRecord[]> {
    return this.repository.transaction(async repo => {
      const brief = await this.findOrThrow(repo, id);
      if (![MealBriefStatus.Submitted, MealBriefStatus.Approved, MealBriefStatus.AssistantConfirmed].includes(brief.status)) {
        throw new BusinessException('MEAL_BRIEF_TASK_STATUS_INVALID', 'brief 提交后才能生成助理任务清单');
      }

      const tasks = this.buildTaskList(brief);
      const saved = await repo.replaceTasks(id, tasks);
      await this.audit(repo, 'meal_brief.generate_tasks', id, undefined, { count: saved.length }, MealBriefActorType.Operations);
      return saved;
    });
  }

  scheduleReminder(id: string, dto: ScheduleReminderDto): Promise<void> {
    return this.repository.transaction(async repo => {
      const brief = await this.findOrThrow(repo, id);
      if (![MealBriefStatus.Approved, MealBriefStatus.AssistantConfirmed].includes(brief.status)) {
        throw new BusinessException('MEAL_BRIEF_REMINDER_STATUS_INVALID', 'brief 审核通过后才能创建服务前提醒');
      }

      await repo.createReminder({
        mealBriefId: id,
        remindAt: new Date(dto.remindAt),
        channel: dto.channel || 'staff_mp',
        payload: {
          title: '服务前餐前 brief 提醒',
          assistantVisibleBrief: brief.assistantVisibleBrief
        }
      });
      await this.audit(repo, 'meal_brief.schedule_reminder', id, undefined, { remindAt: dto.remindAt }, MealBriefActorType.Operations);
    });
  }

  markReminderSent(id: string): Promise<MealBriefRecord> {
    return this.repository.transaction(async repo => {
      const brief = await this.findOrThrow(repo, id);
      this.assertTransition(brief.status, MealBriefStatus.ReminderSent);
      await repo.markReminderSent(id);
      const next = await repo.updateStatus(id, MealBriefStatus.ReminderSent);
      await this.statusLog(repo, id, brief.status, next.status, 'reminder_sent', MealBriefActorType.System);
      await this.audit(repo, 'meal_brief.reminder_sent', id, { status: brief.status }, { status: next.status }, MealBriefActorType.System);
      return next;
    });
  }

  review(id: string, dto: ServiceReviewDto): Promise<MealBriefRecord> {
    return this.repository.transaction(async repo => {
      const brief = await this.findOrThrow(repo, id);
      if (![MealBriefStatus.AssistantConfirmed, MealBriefStatus.ReminderSent, MealBriefStatus.Reviewed].includes(brief.status)) {
        throw new BusinessException('MEAL_BRIEF_REVIEW_STATUS_INVALID', '助理确认后才能进行服务后复盘');
      }

      await repo.upsertReview(id, dto);
      const next = await repo.updateStatus(id, MealBriefStatus.Reviewed);
      await this.statusLog(repo, id, brief.status, next.status, 'review', MealBriefActorType.Operations, dto.createdBy);
      await this.audit(repo, 'meal_brief.review', id, { status: brief.status }, { status: next.status }, MealBriefActorType.Operations, dto.createdBy, {
        rating: dto.rating
      });
      return next;
    });
  }

  private assertTransition(from: MealBriefStatus, to: MealBriefStatus) {
    if (!MEAL_BRIEF_TRANSITIONS[from].includes(to)) {
      throw new BusinessException('MEAL_BRIEF_STATUS_INVALID', `非法餐前 brief 状态流转：${from} -> ${to}`);
    }
  }

  private assertBriefReadyForSubmit(brief: MealBriefRecord) {
    const missing: string[] = [];
    if (!brief.banquetTheme) missing.push('宴请主题');
    if (!brief.customerBackground) missing.push('客户背景');
    if (!brief.diningPurpose) missing.push('饭局目的');
    if (!brief.attendeeCount) missing.push('到场人数');
    if (!brief.assistantVisibleBrief) missing.push('助理可见 brief');

    if (missing.length > 0) {
      throw new BusinessException('MEAL_BRIEF_REQUIRED_FIELDS_MISSING', `brief 缺少必要信息：${missing.join('、')}`);
    }
  }

  private async findOrThrow(repo: MealBriefRepository, id: string): Promise<MealBriefRecord> {
    const brief = await repo.findById(id);
    if (!brief) throw new NotFoundException('餐前 brief 不存在');
    return brief;
  }

  private composeAssistantVisibleBrief(input: Partial<MealBriefRecord | CreateMealBriefDto | UpsertMealBriefDto>): string {
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

  private buildTaskList(brief: MealBriefRecord): Array<{ title: string; detail?: string; role?: string; sortOrder: number }> {
    const tasks = [
      {
        title: '服务前阅读餐前 brief',
        detail: brief.assistantVisibleBrief,
        role: '商务助理',
        sortOrder: 10
      },
      {
        title: '确认着装与形象要求',
        detail: brief.dressCode || '按商务正式、克制得体原则执行',
        role: '商务助理',
        sortOrder: 20
      },
      {
        title: '准备推荐话题',
        detail: brief.recommendedTopics.join('、') || '围绕客户背景、城市、行业趋势等轻商务话题展开',
        role: '商务助理',
        sortOrder: 30
      },
      {
        title: '避开禁忌话题',
        detail: brief.tabooTopics.join('、') || '避免隐私、敏感争议和客户明确不希望讨论的话题',
        role: '商务助理',
        sortOrder: 40
      },
      {
        title: '按角色分工执行现场协同',
        detail: brief.roleAssignments.map(item => {
          const role = String(item.role || '');
          const owner = item.owner ? `-${String(item.owner)}` : '';
          const responsibility = String(item.responsibility || '');
          return `${role}${owner}：${responsibility}`;
        }).join('\n'),
        role: '商务助理',
        sortOrder: 50
      }
    ];

    return tasks.filter(task => task.detail !== '');
  }

  private audit(
    repo: MealBriefRepository,
    action: string,
    resourceId: string,
    beforeData: unknown,
    afterData: unknown,
    actorType: MealBriefActorType,
    actorId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    return repo.createAuditLog({
      actorId,
      actorType,
      action,
      resourceType: 'meal_brief',
      resourceId,
      beforeData,
      afterData,
      metadata
    });
  }

  private statusLog(
    repo: MealBriefRepository,
    mealBriefId: string,
    fromStatus: MealBriefStatus | null,
    toStatus: MealBriefStatus,
    trigger: string,
    actorType: MealBriefActorType,
    actorId?: string
  ): Promise<void> {
    return repo.createStatusLog({
      mealBriefId,
      fromStatus,
      toStatus,
      trigger,
      actorType,
      actorId
    });
  }
}
