import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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
export class MealBriefsController {
  constructor(private readonly mealBriefService: MealBriefService) {}

  @Post('/admin/meal-briefs')
  create(@Body() dto: CreateMealBriefDto) {
    return this.mealBriefService.create(dto);
  }

  @Get('/admin/meal-briefs')
  list(@Query() query: ListMealBriefQueryDto) {
    return this.mealBriefService.list(query);
  }

  @Get('/admin/meal-briefs/:id')
  getManagerBrief(@Param('id') id: string) {
    return this.mealBriefService.getManagerBrief(id);
  }

  @Patch('/admin/meal-briefs/:id')
  update(@Param('id') id: string, @Body() dto: UpsertMealBriefDto) {
    return this.mealBriefService.update(id, dto);
  }

  @Post('/admin/meal-briefs/:id/submit')
  submit(@Param('id') id: string, @Body() dto: SubmitMealBriefDto) {
    return this.mealBriefService.submit(id, dto);
  }

  @Post('/admin/meal-briefs/:id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveMealBriefDto) {
    return this.mealBriefService.approve(id, dto);
  }

  @Post('/admin/meal-briefs/:id/generate-tasks')
  generateTasks(@Param('id') id: string) {
    return this.mealBriefService.generateAssistantTasks(id);
  }

  @Post('/admin/meal-briefs/:id/reminders')
  scheduleReminder(@Param('id') id: string, @Body() dto: ScheduleReminderDto) {
    return this.mealBriefService.scheduleReminder(id, dto);
  }

  @Post('/admin/meal-briefs/:id/reminders/mark-sent')
  markReminderSent(@Param('id') id: string) {
    return this.mealBriefService.markReminderSent(id);
  }

  @Post('/admin/meal-briefs/:id/review')
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
