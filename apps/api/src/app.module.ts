import { Module } from '@nestjs/common';
import { AssistantsModule } from './modules/assistants/assistants.module';
import { MealBriefsModule } from './modules/meal-briefs/meal-briefs.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RiskComplianceModule } from './modules/risk-compliance/risk-compliance.module';

@Module({
  imports: [OrdersModule, PaymentsModule, MealBriefsModule, RiskComplianceModule, AssistantsModule]
})
export class AppModule {}
