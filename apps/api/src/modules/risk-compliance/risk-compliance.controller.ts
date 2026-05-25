import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '@/common/auth/bearer-auth.guard';
import { PermissionsGuard } from '@/common/auth/permissions.guard';
import { AllowAnonymous, RequirePermissions } from '@/common/auth/rbac.decorators';
import {
  ConfirmProtocolDto,
  CreateBlacklistEntryDto,
  CreateComplaintDto,
  CreateOrderExceptionDto,
  CreateRiskReportDto,
  DecideProfileReviewDto,
  DetectRiskDto,
  PageQueryDto,
  ResolveOrderExceptionDto,
  SubmitProfileReviewDto,
  UpdateBlacklistEntryDto,
  UpdateComplaintDto,
  UpsertSensitiveWordDto
} from './dto/risk-compliance.dto';
import { RiskComplianceService } from './risk-compliance.service';

@Controller()
@UseGuards(BearerAuthGuard, PermissionsGuard)
@RequirePermissions('risk:update')
export class RiskComplianceController {
  constructor(private readonly riskComplianceService: RiskComplianceService) {}

  @Get('/admin/risk/sensitive-words')
  listSensitiveWords(@Query() query: PageQueryDto) {
    return this.riskComplianceService.listSensitiveWords(query);
  }

  @Post('/admin/risk/sensitive-words')
  createSensitiveWord(@Body() dto: UpsertSensitiveWordDto) {
    return this.riskComplianceService.upsertSensitiveWord(undefined, dto);
  }

  @Patch('/admin/risk/sensitive-words/:id')
  updateSensitiveWord(@Param('id') id: string, @Body() dto: UpsertSensitiveWordDto) {
    return this.riskComplianceService.upsertSensitiveWord(id, dto);
  }

  @Post('/admin/risk/detect')
  detect(@Body() dto: DetectRiskDto) {
    return this.riskComplianceService.detect(dto);
  }

  @Get('/admin/risk/profile-reviews')
  listProfileReviews(@Query() query: PageQueryDto) {
    return this.riskComplianceService.listProfileReviews(query);
  }

  @Post('/admin/risk/profile-reviews')
  submitProfileReview(@Body() dto: SubmitProfileReviewDto) {
    return this.riskComplianceService.submitProfileReview(dto);
  }

  @Post('/admin/risk/profile-reviews/:id/decision')
  decideProfileReview(@Param('id') id: string, @Body() dto: DecideProfileReviewDto) {
    return this.riskComplianceService.decideProfileReview(id, dto);
  }

  @Post('/protocol-confirmations')
  @AllowAnonymous()
  confirmProtocol(@Body() dto: ConfirmProtocolDto, @Headers('x-forwarded-for') ip?: string, @Headers('user-agent') userAgent?: string) {
    return this.riskComplianceService.confirmProtocol(dto, { ip, userAgent });
  }

  @Get('/admin/risk/orders/:orderId/protocol-ready')
  assertOrderProtocolReady(@Param('orderId') orderId: string) {
    return this.riskComplianceService.assertOrderProtocolReady(orderId);
  }

  @Get('/admin/risk/complaints')
  listComplaints(@Query() query: PageQueryDto) {
    return this.riskComplianceService.listComplaints(query);
  }

  @Post('/admin/risk/complaints')
  createComplaint(@Body() dto: CreateComplaintDto) {
    return this.riskComplianceService.createComplaint(dto);
  }

  @Patch('/admin/risk/complaints/:id')
  updateComplaint(@Param('id') id: string, @Body() dto: UpdateComplaintDto) {
    return this.riskComplianceService.updateComplaint(id, dto);
  }

  @Get('/admin/risk/blacklist')
  listBlacklist(@Query() query: PageQueryDto) {
    return this.riskComplianceService.listBlacklist(query);
  }

  @Post('/admin/risk/blacklist')
  createBlacklistEntry(@Body() dto: CreateBlacklistEntryDto) {
    return this.riskComplianceService.createBlacklistEntry(dto);
  }

  @Patch('/admin/risk/blacklist/:id')
  updateBlacklistEntry(@Param('id') id: string, @Body() dto: UpdateBlacklistEntryDto) {
    return this.riskComplianceService.updateBlacklistEntry(id, dto);
  }

  @Get('/admin/risk/order-exceptions')
  listOrderExceptions(@Query() query: PageQueryDto) {
    return this.riskComplianceService.listOrderExceptions(query);
  }

  @Post('/admin/risk/order-exceptions')
  createOrderException(@Body() dto: CreateOrderExceptionDto) {
    return this.riskComplianceService.createOrderException(dto);
  }

  @Patch('/admin/risk/order-exceptions/:id')
  resolveOrderException(@Param('id') id: string, @Body() dto: ResolveOrderExceptionDto) {
    return this.riskComplianceService.resolveOrderException(id, dto);
  }

  @Get('/admin/risk/report')
  getRiskReport() {
    return this.riskComplianceService.getRiskReport();
  }

  @Post('/admin/risk/reports')
  createRiskReport(@Body() dto: CreateRiskReportDto) {
    return this.riskComplianceService.createRiskReport(dto);
  }
}
