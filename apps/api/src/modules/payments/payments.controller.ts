import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
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
  createPayment(
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentDto
  ) {
    return this.paymentService.createPayment(orderId, dto);
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
  refund(
    @Param('orderId') orderId: string,
    @Body() dto: RefundRequestDto
  ) {
    return this.paymentService.refund(orderId, dto);
  }

  @Post('/admin/refunds/:refundId/approve')
  approveRefund(
    @Param('refundId') refundId: string,
    @Body() dto: ApproveRefundDto
  ) {
    return this.paymentService.approveRefund(refundId, dto.approvedBy, dto.remark);
  }

  @Post('/admin/refunds/:refundId/execute')
  executeRefund(
    @Param('refundId') refundId: string,
    @Body() body: { provider?: PaymentProviderName }
  ) {
    return this.paymentService.executeApprovedRefund(refundId, body.provider);
  }
}
