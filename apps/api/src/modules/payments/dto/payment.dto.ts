import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import type { PaymentProviderName } from '../providers/payment-provider.interface';

export class CreatePaymentDto {
  @IsOptional()
  @IsIn(['mock', 'wechat_pay'])
  provider?: PaymentProviderName;

  @IsOptional()
  @IsString()
  payerOpenid?: string;
}

export class RefundRequestDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @MaxLength(300)
  reason: string;

  @IsOptional()
  @IsUUID()
  requestedBy?: string;
}

export class ApproveRefundDto {
  @IsUUID()
  approvedBy: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  remark?: string;
}
