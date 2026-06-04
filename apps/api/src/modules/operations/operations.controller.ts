import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { BearerAuthGuard } from '@/common/auth/bearer-auth.guard';
import { PermissionsGuard } from '@/common/auth/permissions.guard';
import { RequirePermissions } from '@/common/auth/rbac.decorators';
import { OperationsService } from './operations.service';

@Controller('/admin/operations')
@UseGuards(BearerAuthGuard, PermissionsGuard)
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('/hub')
  @RequirePermissions('operations:read')
  getHub() {
    return this.operationsService.getHub();
  }

  @Get('/finance')
  @RequirePermissions('finance:read')
  listFinance(@Query() query: Record<string, unknown>) {
    return this.operationsService.listFinance(query);
  }

  @Get('/approvals')
  @RequirePermissions('approval:read')
  listApprovals(@Query() query: Record<string, unknown>) {
    return this.operationsService.listApprovals(query);
  }

  @Post('/approvals/:id/decision')
  @RequirePermissions('approval:decide')
  decideApproval(
    @Param('id') id: string,
    @Body() body: { action: 'approved' | 'rejected'; remark?: string },
    @Req() req: Request & { user?: { id: string } }
  ) {
    return this.operationsService.decideApproval(id, body, req.user?.id);
  }

  @Get('/roles')
  @RequirePermissions('rbac:read')
  listRoles() {
    return this.operationsService.listRoles();
  }

  @Patch('/roles/:id/permissions')
  @RequirePermissions('rbac:read')
  updateRolePermissions(
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
    @Req() req: Request & { user?: { id: string } }
  ) {
    return this.operationsService.updateRolePermissions(id, body.permissions || [], req.user?.id);
  }

  @Get('/audit-logs')
  @RequirePermissions('audit_log:read')
  listAuditLogs(@Query() query: Record<string, unknown>) {
    return this.operationsService.listAuditLogs(query);
  }
}
