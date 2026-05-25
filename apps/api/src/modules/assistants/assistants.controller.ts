import { Body, Controller, Get, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BearerAuthGuard } from '@/common/auth/bearer-auth.guard';
import { PermissionsGuard } from '@/common/auth/permissions.guard';
import { RequirePermissions } from '@/common/auth/rbac.decorators';
import { AssistantsService } from './assistants.service';
import {
  AssistantQueryDto,
  CreateAssistantDto,
  UpdateAssistantInternalProfileDto,
  UpdateAssistantPhotoAuditDto,
  UpdateAssistantPublicProfileDto,
  UploadAssistantPhotoDto
} from './dto/assistant.dto';

@Controller('/admin/assistants')
@UseGuards(BearerAuthGuard, PermissionsGuard)
@RequirePermissions('assistant:read')
export class AssistantsController {
  constructor(private readonly assistantsService: AssistantsService) {}

  @Get()
  list(@Query() query: AssistantQueryDto) {
    return this.assistantsService.list(query);
  }

  @Post()
  @RequirePermissions('assistant:update')
  create(@Body() dto: CreateAssistantDto) {
    return this.assistantsService.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.assistantsService.get(id);
  }

  @Patch(':id/internal-profile')
  @RequirePermissions('assistant:update')
  updateInternalProfile(@Param('id') id: string, @Body() dto: UpdateAssistantInternalProfileDto) {
    return this.assistantsService.updateInternalProfile(id, dto);
  }

  @Put(':id/public-profile')
  @RequirePermissions('assistant:update')
  updatePublicProfile(@Param('id') id: string, @Body() dto: UpdateAssistantPublicProfileDto) {
    return this.assistantsService.updatePublicProfile(id, dto);
  }

  @Post(':id/photos')
  @RequirePermissions('assistant:update')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(@Param('id') id: string, @Body() dto: UploadAssistantPhotoDto, @UploadedFile() file: any) {
    return this.assistantsService.uploadPhoto(id, dto, file);
  }

  @Patch(':id/photos/:photoId/audit')
  @RequirePermissions('assistant:audit')
  updatePhotoAudit(@Param('id') id: string, @Param('photoId') photoId: string, @Body() dto: UpdateAssistantPhotoAuditDto) {
    return this.assistantsService.updatePhotoAudit(id, photoId, dto);
  }
}
