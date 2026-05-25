import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  OrderStatus,
  OrderTransitionActorType,
  OrderTransitionTrigger
} from '../enums/order-status.enum';

export class TransitionOrderStatusDto {
  @IsEnum(OrderStatus)
  toStatus: OrderStatus;

  @IsEnum(OrderTransitionTrigger)
  trigger: OrderTransitionTrigger;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsEnum(OrderTransitionActorType)
  actorType: OrderTransitionActorType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsEnum(OrderTransitionActorType)
  actorType: OrderTransitionActorType;
}

export class RefundOrderDto {
  @IsString()
  refundNo: string;

  @IsOptional()
  @IsString()
  paymentNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;
}

export class DepositPaidCallbackDto {
  @IsString()
  provider: string;

  @IsString()
  eventId: string;

  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  paymentNo?: string;

  @IsOptional()
  @IsString()
  providerTransactionId?: string;

  @IsObject()
  rawPayload: Record<string, unknown>;
}
