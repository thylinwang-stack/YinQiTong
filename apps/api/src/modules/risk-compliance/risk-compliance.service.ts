import { Inject, Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/errors/business.exception';
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
import { DEFAULT_SENSITIVE_WORDS, detectSensitiveContent } from './risk-detector';
import { ImageAuditStatus, ProfileReviewStatus, RiskLevel } from './risk.enums';
import {
  RISK_COMPLIANCE_REPOSITORY,
  RiskComplianceRepository
} from './repositories/risk-compliance.repository';

@Injectable()
export class RiskComplianceService {
  constructor(
    @Inject(RISK_COMPLIANCE_REPOSITORY)
    private readonly repository: RiskComplianceRepository
  ) {}

  listSensitiveWords(query: PageQueryDto) {
    return this.repository.listSensitiveWords(query);
  }

  async upsertSensitiveWord(id: string | undefined, dto: UpsertSensitiveWordDto) {
    return this.repository.transaction(async repo => {
      const record = await repo.upsertSensitiveWord(id, dto);
      await this.audit(repo, id ? 'risk_sensitive_word.update' : 'risk_sensitive_word.create', 'risk_sensitive_word', String(record.id), undefined, record);
      return record;
    });
  }

  async detect(dto: DetectRiskDto) {
    const rules = await this.loadRules();
    return detectSensitiveContent(dto.text, rules);
  }

  async submitProfileReview(dto: SubmitProfileReviewDto) {
    return this.repository.transaction(async repo => {
      const rules = await repo.getActiveSensitiveWords();
      const detection = detectSensitiveContent(JSON.stringify(dto.contentSnapshot), rules.length ? rules : DEFAULT_SENSITIVE_WORDS);
      const record = await repo.submitProfileReview({ ...dto, detection });
      if (!detection.safe) {
        await repo.recordRiskEvent({
          eventType: 'public_profile_review_hit',
          bizType: 'assistant_profile',
          bizId: dto.assistantId,
          riskLevel: detection.level,
          summary: '对外展示资料命中风控规则',
          detail: { hits: detection.hits, sanitizedText: detection.sanitizedText }
        });
      }
      await this.audit(repo, 'public_profile_review.submit', 'public_profile_review', String(record.id), undefined, record, {
        safe: detection.safe,
        level: detection.level
      });
      return record;
    });
  }

  async decideProfileReview(id: string, dto: DecideProfileReviewDto) {
    if (dto.status === ProfileReviewStatus.Approved && dto.imageAuditStatus !== ImageAuditStatus.Approved) {
      throw new BusinessException('PROFILE_IMAGE_NOT_APPROVED', '图片审核未通过时不能批准对外展示资料');
    }

    return this.repository.transaction(async repo => {
      const record = await repo.decideProfileReview(id, dto);
      await this.audit(repo, `public_profile_review.${dto.status}`, 'public_profile_review', id, undefined, record);
      return record;
    });
  }

  listProfileReviews(query: PageQueryDto) {
    return this.repository.listProfileReviews(query);
  }

  async confirmProtocol(dto: ConfirmProtocolDto, meta: { ip?: string; userAgent?: string } = {}) {
    return this.repository.transaction(async repo => {
      const record = await repo.confirmProtocol({
        orderId: dto.orderId,
        actorType: dto.actorType,
        actorId: dto.actorId,
        protocolVersion: dto.protocolVersion || 'service_boundary_v1',
        ip: meta.ip,
        userAgent: meta.userAgent
      });
      await this.audit(repo, 'protocol.confirm', 'protocol_confirmation', String(record.id), undefined, record, {
        orderId: dto.orderId,
        actorType: dto.actorType
      });
      return record;
    });
  }

  async assertOrderProtocolReady(orderId: string) {
    const count = await this.repository.countProtocolConfirmations(orderId);
    if (count.customer < 1) {
      throw new BusinessException('CUSTOMER_PROTOCOL_NOT_CONFIRMED', '客户未确认服务边界协议');
    }
    if (count.assistant < 1) {
      throw new BusinessException('ASSISTANT_PROTOCOL_NOT_CONFIRMED', '商务助理未确认服务边界协议');
    }
    return { ready: true, ...count };
  }

  async createComplaint(dto: CreateComplaintDto) {
    return this.repository.transaction(async repo => {
      const detection = detectSensitiveContent(dto.description, await this.loadRules(repo));
      const record = await repo.createComplaint(dto);
      if (!detection.safe || dto.priority === RiskLevel.High || dto.priority === RiskLevel.Critical) {
        await repo.recordRiskEvent({
          eventType: 'complaint_created',
          bizType: 'complaint',
          bizId: String(record.id),
          riskLevel: detection.safe ? dto.priority : detection.level,
          summary: '投诉进入风控处理',
          detail: { complaint: record, hits: detection.hits }
        });
      }
      await this.audit(repo, 'complaint.create', 'complaint', String(record.id), undefined, record);
      return record;
    });
  }

  async updateComplaint(id: string, dto: UpdateComplaintDto) {
    return this.repository.transaction(async repo => {
      const record = await repo.updateComplaint(id, dto);
      await this.audit(repo, 'complaint.update', 'complaint', id, undefined, record);
      return record;
    });
  }

  listComplaints(query: PageQueryDto) {
    return this.repository.listComplaints(query);
  }

  async createBlacklistEntry(dto: CreateBlacklistEntryDto) {
    return this.repository.transaction(async repo => {
      const record = await repo.createBlacklistEntry(dto);
      await repo.recordRiskEvent({
        eventType: 'blacklist_created',
        bizType: 'blacklist',
        bizId: String(record.id),
        riskLevel: 'high',
        summary: '新增黑名单对象',
        detail: record
      });
      await this.audit(repo, 'blacklist.create', 'blacklist_entry', String(record.id), undefined, record);
      return record;
    });
  }

  async updateBlacklistEntry(id: string, dto: UpdateBlacklistEntryDto) {
    return this.repository.transaction(async repo => {
      const record = await repo.updateBlacklistEntry(id, dto);
      await this.audit(repo, 'blacklist.update', 'blacklist_entry', id, undefined, record);
      return record;
    });
  }

  listBlacklist(query: PageQueryDto) {
    return this.repository.listBlacklist(query);
  }

  async createOrderException(dto: CreateOrderExceptionDto) {
    return this.repository.transaction(async repo => {
      const record = await repo.createOrderException(dto);
      await repo.recordRiskEvent({
        eventType: 'order_exception',
        bizType: 'order',
        bizId: dto.orderId,
        riskLevel: dto.riskLevel,
        summary: dto.summary,
        detail: dto.detail || {}
      });
      await this.audit(repo, 'order_exception.create', 'order_exception_case', String(record.id), undefined, record);
      return record;
    });
  }

  async resolveOrderException(id: string, dto: ResolveOrderExceptionDto) {
    return this.repository.transaction(async repo => {
      const record = await repo.updateOrderException(id, {
        status: dto.status,
        handlerId: dto.handlerId
      });
      await this.audit(repo, 'order_exception.update', 'order_exception_case', id, undefined, record);
      return record;
    });
  }

  listOrderExceptions(query: PageQueryDto) {
    return this.repository.listOrderExceptions(query);
  }

  async getRiskReport() {
    return this.repository.getRiskReport();
  }

  async createRiskReport(dto: CreateRiskReportDto) {
    const metrics = await this.repository.getRiskReport();
    const pendingProfileReviews = Number(metrics.pendingProfileReviews || 0);
    const pendingComplaints = Number(metrics.pendingComplaints || 0);
    const openExceptions = Number(metrics.openExceptions || 0);
    return this.repository.createRiskReport({
      ...dto,
      metrics,
      summary: `待处理资料审核 ${pendingProfileReviews} 条，待处理投诉 ${pendingComplaints} 条，开放异常单 ${openExceptions} 条。`
    });
  }

  private async loadRules(repo: RiskComplianceRepository = this.repository) {
    const rules = await repo.getActiveSensitiveWords();
    return rules.length ? rules : DEFAULT_SENSITIVE_WORDS;
  }

  private audit(
    repo: RiskComplianceRepository,
    action: string,
    resourceType: string,
    resourceId?: string,
    beforeData?: Record<string, unknown>,
    afterData?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) {
    return repo.createAuditLog({
      actorType: 'admin',
      action,
      resourceType,
      resourceId,
      beforeData,
      afterData,
      metadata
    });
  }
}
