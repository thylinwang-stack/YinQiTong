import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';
import { MealBriefStatus } from '../meal-brief.enums';

export class RoleAssignmentDto {
  @IsString()
  @MaxLength(60)
  role: string;

  @IsString()
  @MaxLength(120)
  owner: string;

  @IsString()
  @MaxLength(300)
  responsibility: string;
}

export class UpsertMealBriefDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  banquetTheme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customerBackground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  diningPurpose?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  attendeeCount?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  guestIdentities?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  atmosphereNeeds?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  tabooTopics?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  recommendedTopics?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  dressCode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  roleAssignments?: RoleAssignmentDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  attentionPoints?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  managerPrivateNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  assistantVisibleBrief?: string;
}

export class CreateMealBriefDto extends UpsertMealBriefDto {
  @IsUUID()
  orderId: string;
}

export class SubmitMealBriefDto {
  @IsOptional()
  @IsUUID()
  submittedBy?: string;
}

export class ApproveMealBriefDto {
  @IsOptional()
  @IsUUID()
  approvedBy?: string;
}

export class AssistantConfirmBriefDto {
  @IsOptional()
  @IsUUID()
  assistantId?: string;
}

export class ScheduleReminderDto {
  @IsDateString()
  remindAt: string;

  @IsOptional()
  @IsString()
  channel?: string;
}

export class ServiceReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customerFeedback?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  assistantFeedback?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  internalSummary?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsUUID()
  createdBy?: string;
}

export class UpdateMealBriefTaskDto {
  @IsBoolean()
  checked: boolean;
}

export class AssistantFeedbackDto {
  @IsString()
  @MaxLength(2000)
  assistantFeedback: string;

  @IsOptional()
  @IsUUID()
  assistantId?: string;
}

export class ListMealBriefQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(MealBriefStatus)
  status?: MealBriefStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;
}
