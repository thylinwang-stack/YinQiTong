import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { BearerAuthGuard } from '@/common/auth/bearer-auth.guard';
import { PermissionsGuard } from '@/common/auth/permissions.guard';
import { RequirePermissions } from '@/common/auth/rbac.decorators';
import { ApproveRefundDto, CreatePaymentDto, RefundRequestDto } from './dto/payment.dto';
import { PaymentService } from './payment.service';
import { PaymentProviderName } from './providers/payment-provider.interface';

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

@Controller()
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('/orders/:orderId/payments')
  @UseGuards(BearerAuthGuard)
  createPayment(
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentDto,
    @Req() req: Request & { user?: { id: string; userType?: string } }
  ) {
    return this.paymentService.createPayment(orderId, dto, req.user);
  }

  @Post('/payments/notify/:provider')
  handlePaymentNotify(
    @Param('provider') provider: PaymentProviderName,
    @Req() req: RawBodyRequest
  ) {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    return this.paymentService.handlePaymentNotify(rawBody, req.headers, provider);
  }

  @Post('/admin/orders/:orderId/refunds')
  @UseGuards(BearerAuthGuard, PermissionsGuard)
  @RequirePermissions('refund:approve')
  refund(
    @Param('orderId') orderId: string,
    @Body() dto: RefundRequestDto
  ) {
    return this.paymentService.refund(orderId, dto);
  }

  @Post('/admin/refunds/:refundId/approve')
  @UseGuards(BearerAuthGuard, PermissionsGuard)
  @RequirePermissions('refund:approve')
  approveRefund(
    @Param('refundId') refundId: string,
    @Body() dto: ApproveRefundDto
  ) {
    return this.paymentService.approveRefund(refundId, dto.approvedBy, dto.remark);
  }

  @Post('/admin/refunds/:refundId/execute')
  @UseGuards(BearerAuthGuard, PermissionsGuard)
  @RequirePermissions('refund:approve')
  executeRefund(
    @Param('refundId') refundId: string,
    @Body() body: { provider?: PaymentProviderName }
  ) {
    return this.paymentService.executeApprovedRefund(refundId, body.provider);
  }
}
