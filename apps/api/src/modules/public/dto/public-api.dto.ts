import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested
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
  @MaxLength(80)
  @IsNotEmpty()
  district: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  venueType?: string;

  @IsString()
  @MaxLength(180)
  @IsNotEmpty()
  meetingPoint: string;

  @IsString()
  @MaxLength(60)
  @IsNotEmpty()
  arrivalWindow: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  transportNote?: string;

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

export class AssistantServiceReviewDto {
  @IsString()
  @MaxLength(80)
  assistantId: string;

  @IsString()
  @MaxLength(40)
  assistantNo: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  comment?: string;
}

export class ServiceReviewSubmitDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  atmosphereRating: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  professionalismRating: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  boundarySenseRating: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  punctualityRating: number;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AssistantServiceReviewDto)
  assistantReviews: AssistantServiceReviewDto[];

  @IsArray()
  @ArrayMaxSize(12)
  highlightTags: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @IsOptional()
  @IsBoolean()
  allowFollowUp?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  repurchaseIntent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  token?: string;
}
