import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '@/common/auth/bearer-auth.guard';
import { PermissionsGuard } from '@/common/auth/permissions.guard';
import { RequirePermissions } from '@/common/auth/rbac.decorators';
import {
  ApproveMealBriefDto,
  AssistantFeedbackDto,
  AssistantConfirmBriefDto,
  CreateMealBriefDto,
  ListMealBriefQueryDto,
  ScheduleReminderDto,
  ServiceReviewDto,
  SubmitMealBriefDto,
  UpdateMealBriefTaskDto,
  UpsertMealBriefDto
} from './dto/meal-brief.dto';
import { MealBriefService } from './meal-brief.service';

@Controller()
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class MealBriefsController {
  constructor(private readonly mealBriefService: MealBriefService) {}

  @Post('/admin/meal-briefs')
  @RequirePermissions('meal_brief:update')
  create(@Body() dto: CreateMealBriefDto) {
    return this.mealBriefService.create(dto);
  }

  @Get('/admin/meal-briefs')
  @RequirePermissions('meal_brief:read')
  list(@Query() query: ListMealBriefQueryDto) {
    return this.mealBriefService.list(query);
  }

  @Get('/admin/meal-briefs/:id')
  @RequirePermissions('meal_brief:read')
  getManagerBrief(@Param('id') id: string) {
    return this.mealBriefService.getManagerBrief(id);
  }

  @Patch('/admin/meal-briefs/:id')
  @RequirePermissions('meal_brief:update')
  update(@Param('id') id: string, @Body() dto: UpsertMealBriefDto) {
    return this.mealBriefService.update(id, dto);
  }

  @Post('/admin/meal-briefs/:id/submit')
  @RequirePermissions('meal_brief:update')
  submit(@Param('id') id: string, @Body() dto: SubmitMealBriefDto) {
    return this.mealBriefService.submit(id, dto);
  }

  @Post('/admin/meal-briefs/:id/approve')
  @RequirePermissions('meal_brief:approve')
  approve(@Param('id') id: string, @Body() dto: ApproveMealBriefDto) {
    return this.mealBriefService.approve(id, dto);
  }

  @Post('/admin/meal-briefs/:id/generate-tasks')
  @RequirePermissions('meal_brief:update')
  generateTasks(@Param('id') id: string) {
    return this.mealBriefService.generateAssistantTasks(id);
  }

  @Post('/admin/meal-briefs/:id/reminders')
  @RequirePermissions('meal_brief:update')
  scheduleReminder(@Param('id') id: string, @Body() dto: ScheduleReminderDto) {
    return this.mealBriefService.scheduleReminder(id, dto);
  }

  @Post('/admin/meal-briefs/:id/reminders/mark-sent')
  @RequirePermissions('meal_brief:update')
  markReminderSent(@Param('id') id: string) {
    return this.mealBriefService.markReminderSent(id);
  }

  @Post('/admin/meal-briefs/:id/review')
  @RequirePermissions('meal_brief:update')
  review(@Param('id') id: string, @Body() dto: ServiceReviewDto) {
    return this.mealBriefService.review(id, dto);
  }

  @Get('/staff/meal-briefs/:id')
  getAssistantBrief(@Param('id') id: string) {
    return this.mealBriefService.getAssistantBrief(id);
  }

  @Post('/staff/meal-briefs/:id/confirm')
  async assistantConfirm(@Param('id') id: string, @Body() dto: AssistantConfirmBriefDto) {
    await this.mealBriefService.assistantConfirm(id, dto);
    return this.mealBriefService.getAssistantBrief(id);
  }

  @Patch('/staff/meal-briefs/:id/tasks/:taskId')
  async updateAssistantTask(@Param('id') id: string, @Param('taskId') taskId: string, @Body() dto: UpdateMealBriefTaskDto) {
    await this.mealBriefService.updateAssistantTask(id, taskId, dto);
    return this.mealBriefService.getAssistantBrief(id);
  }

  @Post('/staff/meal-briefs/:id/review')
  async submitAssistantFeedback(@Param('id') id: string, @Body() dto: AssistantFeedbackDto) {
    await this.mealBriefService.submitAssistantFeedback(id, dto);
    return this.mealBriefService.getAssistantBrief(id);
  }
}
