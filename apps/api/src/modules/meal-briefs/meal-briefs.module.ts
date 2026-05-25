import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MealBriefService } from './meal-brief.service';
import { MealBriefsController } from './meal-briefs.controller';
import { MEAL_BRIEF_REPOSITORY } from './repositories/meal-brief.repository';
import { PrismaMealBriefRepository } from './repositories/prisma-meal-brief.repository';

@Module({
  controllers: [MealBriefsController],
  providers: [
    PrismaService,
    MealBriefService,
    {
      provide: MEAL_BRIEF_REPOSITORY,
      useClass: PrismaMealBriefRepository
    }
  ],
  exports: [MealBriefService]
})
export class MealBriefsModule {}
