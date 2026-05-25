export enum MealBriefStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  AssistantConfirmed = 'assistant_confirmed',
  ReminderSent = 'reminder_sent',
  Reviewed = 'reviewed'
}

export enum MealBriefActorType {
  CustomerService = 'customer_service',
  Operations = 'operations',
  Assistant = 'assistant',
  System = 'system'
}

export enum MealBriefTaskStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Done = 'done',
  Skipped = 'skipped'
}

export const MEAL_BRIEF_TRANSITIONS: Record<MealBriefStatus, MealBriefStatus[]> = {
  [MealBriefStatus.Draft]: [MealBriefStatus.Submitted],
  [MealBriefStatus.Submitted]: [MealBriefStatus.Approved, MealBriefStatus.Draft],
  [MealBriefStatus.Approved]: [MealBriefStatus.AssistantConfirmed],
  [MealBriefStatus.AssistantConfirmed]: [MealBriefStatus.ReminderSent, MealBriefStatus.Reviewed],
  [MealBriefStatus.ReminderSent]: [MealBriefStatus.Reviewed],
  [MealBriefStatus.Reviewed]: []
};
