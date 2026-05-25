import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RiskComplianceController } from './risk-compliance.controller';
import { RiskComplianceService } from './risk-compliance.service';
import { PrismaRiskComplianceRepository } from './repositories/prisma-risk-compliance.repository';
import { RISK_COMPLIANCE_REPOSITORY } from './repositories/risk-compliance.repository';

@Module({
  controllers: [RiskComplianceController],
  providers: [
    PrismaService,
    RiskComplianceService,
    {
      provide: RISK_COMPLIANCE_REPOSITORY,
      useClass: PrismaRiskComplianceRepository
    }
  ],
  exports: [RiskComplianceService]
})
export class RiskComplianceModule {}
