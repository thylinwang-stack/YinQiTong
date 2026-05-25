import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OrderStateMachineService } from '@/modules/orders/order-state-machine.service';
import { PaymentService } from './payment.service';
import { PaymentsController } from './payments.controller';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import {
  PAYMENT_PROVIDER_REGISTRY,
  PaymentProviderName
} from './providers/payment-provider.interface';
import { WeChatPayProvider } from './providers/wechat-pay.provider';
import { PAYMENT_REPOSITORY } from './repositories/payment.repository';
import { PrismaPaymentRepository } from './repositories/prisma-payment.repository';

@Module({
  controllers: [PaymentsController],
  providers: [
    PrismaService,
    OrderStateMachineService,
    PaymentService,
    MockPaymentProvider,
    WeChatPayProvider,
    {
      provide: PAYMENT_PROVIDER_REGISTRY,
      inject: [MockPaymentProvider, WeChatPayProvider],
      useFactory: (mock: MockPaymentProvider, wechatPay: WeChatPayProvider) => ({
        mock,
        wechat_pay: wechatPay
      } satisfies Record<PaymentProviderName, MockPaymentProvider | WeChatPayProvider>)
    },
    {
      provide: PAYMENT_REPOSITORY,
      useClass: PrismaPaymentRepository
    }
  ],
  exports: [PaymentService]
})
export class PaymentsModule {}
