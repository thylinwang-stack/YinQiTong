import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MealBriefStatus } from '../meal-brief.enums';
import { CreateMealBriefDto, ListMealBriefQueryDto, ServiceReviewDto, UpsertMealBriefDto } from '../dto/meal-brief.dto';
import { MealBriefPageResult, MealBriefRecord, MealBriefRepository, MealBriefTaskRecord } from './meal-brief.repository';

type PrismaLike = any;

@Injectable()
export class PrismaMealBriefRepository implements MealBriefRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaLike) {}

  transaction<T>(handler: (repo: MealBriefRepository) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => handler(new PrismaMealBriefRepository(tx as PrismaLike)));
  }

  async list(query: ListMealBriefQueryDto): Promise<MealBriefPageResult> {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 10);
    const where: Record<string, unknown> = {
      ...(query.status ? { status: query.status } : {})
    };
    if (query.keyword) {
      where.OR = [
        { banquetTheme: { contains: query.keyword, mode: 'insensitive' } },
        { diningPurpose: { contains: query.keyword, mode: 'insensitive' } },
        { customerBackground: { contains: query.keyword, mode: 'insensitive' } }
      ];
    }

    const [list, total] = await Promise.all([
      this.db.mealBrief.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.db.mealBrief.count({ where })
    ]);
    return { list, total };
  }

  findById(id: string): Promise<MealBriefRecord | null> {
    return this.db.mealBrief.findUnique({ where: { id } });
  }

  findByOrderId(orderId: string): Promise<MealBriefRecord | null> {
    return this.db.mealBrief.findUnique({ where: { orderId } });
  }

  create(input: CreateMealBriefDto): Promise<MealBriefRecord> {
    return this.db.mealBrief.create({
      data: this.toData(input)
    });
  }

  update(id: string, input: UpsertMealBriefDto): Promise<MealBriefRecord> {
    return this.db.mealBrief.update({
      where: { id },
      data: this.toData(input)
    });
  }

  updateStatus(id: string, status: MealBriefStatus, patch: Record<string, unknown> = {}): Promise<MealBriefRecord> {
    return this.db.mealBrief.update({
      where: { id },
      data: { status, ...patch }
    });
  }

  async replaceTasks(mealBriefId: string, tasks: Array<{ title: string; detail?: string; role?: string; sortOrder: number }>): Promise<MealBriefTaskRecord[]> {
    await this.db.mealBriefTask.deleteMany({ where: { mealBriefId } });
    await this.db.mealBriefTask.createMany({
      data: tasks.map(task => ({ ...task, mealBriefId }))
    });
    return this.db.mealBriefTask.findMany({ where: { mealBriefId }, orderBy: { sortOrder: 'asc' } });
  }

  listTasks(mealBriefId: string): Promise<MealBriefTaskRecord[]> {
    return this.db.mealBriefTask.findMany({ where: { mealBriefId }, orderBy: { sortOrder: 'asc' } });
  }

  updateTaskStatus(mealBriefId: string, taskId: string, status: string): Promise<MealBriefTaskRecord> {
    return this.db.mealBriefTask.update({
      where: { id: taskId, mealBriefId },
      data: { status }
    });
  }

  async createReminder(input: { mealBriefId: string; remindAt: Date; channel: string; payload: Record<string, unknown> }): Promise<void> {
    await this.db.mealBriefReminder.create({ data: input });
  }

  async markReminderSent(mealBriefId: string): Promise<void> {
    await this.db.mealBriefReminder.updateMany({
      where: { mealBriefId, status: 'pending' },
      data: { status: 'sent', sentAt: new Date() }
    });
  }

  async upsertReview(mealBriefId: string, input: ServiceReviewDto): Promise<void> {
    await this.db.mealBriefReview.upsert({
      where: { mealBriefId },
      create: { mealBriefId, ...input },
      update: input
    });
  }

  async createStatusLog(input: {
    mealBriefId: string;
    fromStatus?: MealBriefStatus | null;
    toStatus: MealBriefStatus;
    trigger: string;
    actorId?: string;
    actorType: string;
    note?: string;
  }): Promise<void> {
    await this.db.mealBriefStatusLog.create({ data: input });
  }

  async createAuditLog(input: {
    actorId?: string;
    actorType: string;
    action: string;
    resourceType: string;
    resourceId: string;
    beforeData?: unknown;
    afterData?: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.auditLog.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorType,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        beforeData: input.beforeData,
        afterData: input.afterData,
        metadata: input.metadata || {}
      }
    });
  }

  private toData(input: CreateMealBriefDto | UpsertMealBriefDto) {
    return {
      ...input,
      guestIdentities: input.guestIdentities || undefined,
      tabooTopics: input.tabooTopics || undefined,
      recommendedTopics: input.recommendedTopics || undefined,
      roleAssignments: input.roleAssignments || undefined,
      attentionPoints: input.attentionPoints || undefined
    };
  }
}
