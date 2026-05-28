import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';

export class PublicAssistantQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  scene?: string;

  @IsOptional()
  @IsString()
  styleTag?: string;
}

export class AdminBookingQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  city?: string;

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

export class CreateBookingDto {
  @IsString()
  @MaxLength(40)
  city: string;

  @IsString()
  @MaxLength(30)
  date: string;

  @IsString()
  @MaxLength(20)
  time: string;

  @IsString()
  @MaxLength(60)
  dinnerType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  guestCount: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  assistantCount: number;

  @Type(() => Number)
  @IsNumber()
  @Min(300)
  budget: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  preference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  taboos?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sceneId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  packageId?: string;

  @IsBoolean()
  boundaryAgreementConfirmed: boolean;

  @IsOptional()
  @IsString()
  protocolVersion?: string;
}

export class SupportRequestDto {
  @IsString()
  @MaxLength(40)
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;
}
