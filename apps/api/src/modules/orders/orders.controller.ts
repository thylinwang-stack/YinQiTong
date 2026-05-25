import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '@/common/auth/bearer-auth.guard';
import { PermissionsGuard } from '@/common/auth/permissions.guard';
import { RequirePermissions } from '@/common/auth/rbac.decorators';
import {
  CancelOrderDto,
  DepositPaidCallbackDto,
  RefundOrderDto,
  TransitionOrderStatusDto
} from './dto/transition-order-status.dto';
import { OrderStatusService } from './order-status.service';

@Controller()
export class OrdersController {
  constructor(private readonly orderStatusService: OrderStatusService) {}

  @Patch('/admin/orders/:orderId/status')
  @UseGuards(BearerAuthGuard, PermissionsGuard)
  @RequirePermissions('booking:update')
  transitionStatus(
    @Param('orderId') orderId: string,
    @Body() dto: TransitionOrderStatusDto
  ) {
    return this.orderStatusService.transition(orderId, dto);
  }

  @Post('/admin/orders/:orderId/exception')
  @UseGuards(BearerAuthGuard, PermissionsGuard)
  @RequirePermissions('risk:update')
  markException(
    @Param('orderId') orderId: string,
    @Body() body: { actorId: string; reason?: string }
  ) {
    return this.orderStatusService.markException(orderId, body.actorId, body.reason);
  }

  @Post('/orders/:orderId/cancel')
  @UseGuards(BearerAuthGuard)
  cancelOrder(
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto
  ) {
    return this.orderStatusService.cancelOrder(orderId, dto);
  }

  @Post('/admin/orders/:orderId/refund')
  @UseGuards(BearerAuthGuard, PermissionsGuard)
  @RequirePermissions('refund:approve')
  refundOrder(
    @Param('orderId') orderId: string,
    @Body() dto: RefundOrderDto
  ) {
    return this.orderStatusService.refundOrder(orderId, dto);
  }

  @Post('/admin/orders/:orderId/complete')
  @UseGuards(BearerAuthGuard, PermissionsGuard)
  @RequirePermissions('booking:update')
  completeService(
    @Param('orderId') orderId: string,
    @Body() body: { actorId: string; autoStartSettlement?: boolean }
  ) {
    return this.orderStatusService.completeService(
      orderId,
      body.actorId,
      body.autoStartSettlement ?? true
    );
  }

  @Post('/payments/callback/deposit-paid')
  handleDepositPaidCallback(@Body() dto: DepositPaidCallbackDto) {
    return this.orderStatusService.handleDepositPaidCallback(dto);
  }
}
