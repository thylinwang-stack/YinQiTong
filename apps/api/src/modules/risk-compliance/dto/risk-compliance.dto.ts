import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import {
  BlacklistStatus,
  ComplaintStatus,
  ImageAuditStatus,
  OrderExceptionStatus,
  ProfileReviewStatus,
  ProtocolActorType,
  RiskLevel,
  RiskRecordStatus
} from '../risk.enums';

export class PageQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;

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

export class UpsertSensitiveWordDto {
  @IsString()
  @MaxLength(80)
  keyword: string;

  @IsString()
  @MaxLength(60)
  category: string;

  @IsEnum(RiskLevel)
  level: RiskLevel;

  @IsOptional()
  @IsEnum(RiskRecordStatus)
  status?: RiskRecordStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class DetectRiskDto {
  @IsString()
  @MaxLength(5000)
  text: string;
}

export class SubmitProfileReviewDto {
  @IsUUID()
  assistantId: string;

  @IsOptional()
  @IsUUID()
  profileId?: string;

  @IsObject()
  contentSnapshot: Record<string, unknown>;
}

export class DecideProfileReviewDto {
  @IsEnum(ProfileReviewStatus)
  status: ProfileReviewStatus.Approved | ProfileReviewStatus.Rejected | ProfileReviewStatus.RiskHold;

  @IsEnum(ImageAuditStatus)
  imageAuditStatus: ImageAuditStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;

  @IsOptional()
  @IsUUID()
  reviewerId?: string;
}

export class ConfirmProtocolDto {
  @IsUUID()
  orderId: string;

  @IsEnum(ProtocolActorType)
  actorType: ProtocolActorType;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsString()
  protocolVersion?: string;
}

export class CreateComplaintDto {
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsString()
  complainantType: string;

  @IsOptional()
  @IsUUID()
  complainantId?: string;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsUUID()
  targetId?: string;

  @IsString()
  category: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsEnum(RiskLevel)
  priority: RiskLevel;
}

export class UpdateComplaintDto {
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;

  @IsOptional()
  @IsUUID()
  handlerId?: string;
}

export class CreateBlacklistEntryDto {
  @IsString()
  subjectType: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsString()
  @MaxLength(120)
  subjectName: string;

  @IsString()
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsDateString()
  expiredAt?: string;

  @IsOptional()
  @IsUUID()
  createdBy?: string;
}

export class UpdateBlacklistEntryDto {
  @IsEnum(BlacklistStatus)
  status: BlacklistStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class CreateOrderExceptionDto {
  @IsUUID()
  orderId: string;

  @IsString()
  category: string;

  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @IsString()
  @MaxLength(300)
  summary: string;

  @IsOptional()
  @IsObject()
  detail?: Record<string, unknown>;
}

export class ResolveOrderExceptionDto {
  @IsEnum(OrderExceptionStatus)
  status: OrderExceptionStatus.Resolved | OrderExceptionStatus.Ignored | OrderExceptionStatus.Processing;

  @IsOptional()
  @IsUUID()
  handlerId?: string;
}

export class CreateRiskReportDto {
  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsArray()
  scopes?: string[];
}
