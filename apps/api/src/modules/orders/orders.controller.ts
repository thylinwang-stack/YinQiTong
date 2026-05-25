import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
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
  transitionStatus(
    @Param('orderId') orderId: string,
    @Body() dto: TransitionOrderStatusDto
  ) {
    return this.orderStatusService.transition(orderId, dto);
  }

  @Post('/admin/orders/:orderId/exception')
  markException(
    @Param('orderId') orderId: string,
    @Body() body: { actorId: string; reason?: string }
  ) {
    return this.orderStatusService.markException(orderId, body.actorId, body.reason);
  }

  @Post('/orders/:orderId/cancel')
  cancelOrder(
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto
  ) {
    return this.orderStatusService.cancelOrder(orderId, dto);
  }

  @Post('/admin/orders/:orderId/refund')
  refundOrder(
    @Param('orderId') orderId: string,
    @Body() dto: RefundOrderDto
  ) {
    return this.orderStatusService.refundOrder(orderId, dto);
  }

  @Post('/admin/orders/:orderId/complete')
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
