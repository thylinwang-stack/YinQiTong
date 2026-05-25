import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { ImageAuditStatus } from '@/modules/risk-compliance/risk.enums';
import { AssistantPhotoType, AssistantStatus } from '../assistant.enums';

export class AssistantQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(AssistantStatus)
  status?: AssistantStatus;

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

export class CreateAssistantDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  assistantNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  realName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MaxLength(40)
  city: string;

  @IsOptional()
  @IsEnum(AssistantStatus)
  status?: AssistantStatus;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  internalLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  managerPrivateNote?: string;
}

export class UpdateAssistantInternalProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  realName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  idNumberMasked?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  city?: string;

  @IsOptional()
  @IsEnum(AssistantStatus)
  status?: AssistantStatus;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  internalLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  workExperience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  trainingNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  managerPrivateNote?: string;
}

export class UpdateAssistantPublicProfileDto {
  @IsString()
  @MaxLength(40)
  workName: string;

  @IsString()
  @MaxLength(40)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styleTags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sceneSkills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  businessSkills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  publicIntro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  complianceNote?: string;
}

export class UploadAssistantPhotoDto {
  @IsOptional()
  @IsEnum(AssistantPhotoType)
  photoType?: AssistantPhotoType;

  @IsOptional()
  @IsUUID()
  uploadedBy?: string;
}

export class UpdateAssistantPhotoAuditDto {
  @IsEnum(ImageAuditStatus)
  imageAuditStatus: ImageAuditStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  auditRemark?: string;
}
