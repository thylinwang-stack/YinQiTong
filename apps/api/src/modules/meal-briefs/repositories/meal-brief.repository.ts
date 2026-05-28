import { MealBriefStatus } from '../meal-brief.enums';
import { CreateMealBriefDto, ListMealBriefQueryDto, RoleAssignmentDto, ServiceReviewDto, UpsertMealBriefDto } from '../dto/meal-brief.dto';

export type MealBriefRoleAssignment = RoleAssignmentDto | {
  role?: unknown;
  owner?: unknown;
  responsibility?: unknown;
  [key: string]: unknown;
};

export interface MealBriefRecord {
  id: string;
  orderId: string;
  status: MealBriefStatus;
  banquetTheme?: string | null;
  customerBackground?: string | null;
  diningPurpose?: string | null;
  attendeeCount?: number | null;
  guestIdentities: string[];
  atmosphereNeeds?: string | null;
  tabooTopics: string[];
  recommendedTopics: string[];
  dressCode?: string | null;
  roleAssignments: MealBriefRoleAssignment[];
  attentionPoints: string[];
  managerPrivateNote?: string | null;
  assistantVisibleBrief: string;
}

export interface MealBriefTaskRecord {
  id: string;
  mealBriefId: string;
  title: string;
  detail?: string | null;
  role?: string | null;
  sortOrder: number;
  status: string;
}

export interface MealBriefStatusLogRecord {
  id: string;
  mealBriefId: string;
  fromStatus?: MealBriefStatus | null;
  toStatus: MealBriefStatus;
  trigger: string;
  actorId?: string | null;
  actorType: string;
  note?: string | null;
}

export interface MealBriefPageResult {
  list: MealBriefRecord[];
  total: number;
}

export interface MealBriefRepository {
  transaction<T>(handler: (repo: MealBriefRepository) => Promise<T>): Promise<T>;
  list(query: ListMealBriefQueryDto): Promise<MealBriefPageResult>;
  findById(id: string): Promise<MealBriefRecord | null>;
  findByOrderId(orderId: string): Promise<MealBriefRecord | null>;
  create(input: CreateMealBriefDto): Promise<MealBriefRecord>;
  update(id: string, input: UpsertMealBriefDto): Promise<MealBriefRecord>;
  updateStatus(id: string, status: MealBriefStatus, patch?: Record<string, unknown>): Promise<MealBriefRecord>;
  replaceTasks(mealBriefId: string, tasks: Array<{ title: string; detail?: string; role?: string; sortOrder: number }>): Promise<MealBriefTaskRecord[]>;
  listTasks(mealBriefId: string): Promise<MealBriefTaskRecord[]>;
  updateTaskStatus(mealBriefId: string, taskId: string, status: string): Promise<MealBriefTaskRecord>;
  createReminder(input: { mealBriefId: string; remindAt: Date; channel: string; payload: Record<string, unknown> }): Promise<void>;
  markReminderSent(mealBriefId: string): Promise<void>;
  upsertReview(mealBriefId: string, input: ServiceReviewDto): Promise<void>;
  createStatusLog(input: {
    mealBriefId: string;
    fromStatus?: MealBriefStatus | null;
    toStatus: MealBriefStatus;
    trigger: string;
    actorId?: string;
    actorType: string;
    note?: string;
  }): Promise<void>;
  createAuditLog(input: {
    actorId?: string;
    actorType: string;
    action: string;
    resourceType: string;
    resourceId: string;
    beforeData?: unknown;
    afterData?: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export const MEAL_BRIEF_REPOSITORY = Symbol('MEAL_BRIEF_REPOSITORY');
