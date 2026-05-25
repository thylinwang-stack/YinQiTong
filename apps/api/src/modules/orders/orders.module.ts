import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { OrderStatusService } from './order-status.service';
import { OrdersController } from './orders.controller';
import { ORDER_STATUS_REPOSITORY } from './repositories/order-status.repository';
import { PrismaOrderStatusRepository } from './repositories/prisma-order-status.repository';

@Module({
  controllers: [OrdersController],
  providers: [
    PrismaService,
    OrderStateMachineService,
    OrderStatusService,
    {
      provide: ORDER_STATUS_REPOSITORY,
      useClass: PrismaOrderStatusRepository
    }
  ],
  exports: [OrderStateMachineService, OrderStatusService]
})
export class OrdersModule {}
