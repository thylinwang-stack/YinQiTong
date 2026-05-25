import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateBlacklistEntryDto,
  CreateComplaintDto,
  CreateOrderExceptionDto,
  CreateRiskReportDto,
  DecideProfileReviewDto,
  PageQueryDto,
  SubmitProfileReviewDto,
  UpdateBlacklistEntryDto,
  UpdateComplaintDto,
  UpsertSensitiveWordDto
} from '../dto/risk-compliance.dto';
import { RiskDetectionResult, SensitiveWordRule } from '../risk-detector';
import { ComplaintStatus, OrderExceptionStatus, RiskRecordStatus } from '../risk.enums';
import { PageResult, RiskComplianceRepository } from './risk-compliance.repository';

type PrismaLike = PrismaService & { [key: string]: any };

@Injectable()
export class PrismaRiskComplianceRepository implements RiskComplianceRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaLike) {}

  transaction<T>(handler: (repo: RiskComplianceRepository) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => handler(new PrismaRiskComplianceRepository(tx as PrismaLike)));
  }

  listSensitiveWords(query: PageQueryDto): Promise<PageResult<Record<string, unknown>>> {
    return this.page(this.db.riskSensitiveWord, query, ['keyword', 'category', 'note']);
  }

  async getActiveSensitiveWords(): Promise<SensitiveWordRule[]> {
    const rows = await this.db.riskSensitiveWord.findMany({ where: { status: RiskRecordStatus.Active } });
    return rows.map(row => ({
      keyword: row.keyword,
      category: row.category,
      level: row.level,
      status: row.status
    }));
  }

  upsertSensitiveWord(id: string | undefined, input: UpsertSensitiveWordDto): Promise<Record<string, unknown>> {
    if (id) {
      return this.db.riskSensitiveWord.update({ where: { id }, data: input });
    }
    return this.db.riskSensitiveWord.create({
      data: {
        ...input,
        status: input.status || RiskRecordStatus.Active
      }
    });
  }

  recordRiskEvent(input: {
    eventType: string;
    bizType: string;
    bizId?: string;
    riskLevel: string;
    summary: string;
    detail: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    return this.db.riskEvent.create({
      data: {
        eventNo: `RISK${Date.now()}`,
        ...input
      }
    });
  }

  submitProfileReview(input: SubmitProfileReviewDto & { detection: RiskDetectionResult }): Promise<Record<string, unknown>> {
    return this.db.publicProfileReview.create({
      data: {
        assistantId: input.assistantId,
        profileId: input.profileId,
        contentSnapshot: input.contentSnapshot,
        findings: input.detection.hits,
        riskLevel: input.detection.level,
        status: input.detection.safe ? 'pending' : 'risk_hold',
        imageAuditStatus: 'pending'
      }
    });
  }

  decideProfileReview(id: string, input: DecideProfileReviewDto): Promise<Record<string, unknown>> {
    return this.db.publicProfileReview.update({
      where: { id },
      data: {
        status: input.status,
        imageAuditStatus: input.imageAuditStatus,
        reviewerId: input.reviewerId,
        reviewedAt: new Date(),
        rejectionReason: input.rejectionReason
      }
    });
  }

  listProfileReviews(query: PageQueryDto): Promise<PageResult<Record<string, unknown>>> {
    return this.page(this.db.publicProfileReview, query, ['assistantId', 'rejectionReason']);
  }

  async confirmProtocol(input: {
    orderId: string;
    actorType: string;
    actorId?: string;
    protocolVersion: string;
    ip?: string;
    userAgent?: string;
  }): Promise<Record<string, unknown>> {
    const existed = await this.db.protocolConfirmation.findFirst({
      where: {
        orderId: input.orderId,
        actorType: input.actorType,
        actorId: input.actorId,
        protocolVersion: input.protocolVersion
      }
    });
    if (existed) return existed;
    return this.db.protocolConfirmation.create({ data: input });
  }

  async countProtocolConfirmations(orderId: string): Promise<{ customer: number; assistant: number }> {
    const [customer, assistant] = await Promise.all([
      this.db.protocolConfirmation.count({ where: { orderId, actorType: 'customer' } }),
      this.db.protocolConfirmation.count({ where: { orderId, actorType: 'assistant' } })
    ]);
    return { customer, assistant };
  }

  createComplaint(input: CreateComplaintDto): Promise<Record<string, unknown>> {
    return this.db.complaint.create({
      data: {
        complaintNo: `CP${Date.now()}`,
        status: ComplaintStatus.Pending,
        ...input
      }
    });
  }

  updateComplaint(id: string, input: UpdateComplaintDto): Promise<Record<string, unknown>> {
    return this.db.complaint.update({
      where: { id },
      data: {
        ...input,
        resolvedAt: input.status === ComplaintStatus.Resolved ? new Date() : undefined
      }
    });
  }

  listComplaints(query: PageQueryDto): Promise<PageResult<Record<string, unknown>>> {
    return this.page(this.db.complaint, query, ['complaintNo', 'category', 'description', 'resolution']);
  }

  createBlacklistEntry(input: CreateBlacklistEntryDto): Promise<Record<string, unknown>> {
    return this.db.blacklistEntry.create({
      data: {
        ...input,
        expiredAt: input.expiredAt ? new Date(input.expiredAt) : undefined
      }
    });
  }

  updateBlacklistEntry(id: string, input: UpdateBlacklistEntryDto): Promise<Record<string, unknown>> {
    return this.db.blacklistEntry.update({ where: { id }, data: input });
  }

  listBlacklist(query: PageQueryDto): Promise<PageResult<Record<string, unknown>>> {
    return this.page(this.db.blacklistEntry, query, ['subjectName', 'reason', 'subjectType']);
  }

  createOrderException(input: CreateOrderExceptionDto): Promise<Record<string, unknown>> {
    return this.db.orderExceptionCase.create({
      data: {
        exceptionNo: `EX${Date.now()}`,
        status: OrderExceptionStatus.Open,
        ...input
      }
    });
  }

  updateOrderException(id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.db.orderExceptionCase.update({
      where: { id },
      data: {
        ...input,
        resolvedAt: ['resolved', 'ignored'].includes(String(input.status)) ? new Date() : undefined
      }
    });
  }

  listOrderExceptions(query: PageQueryDto): Promise<PageResult<Record<string, unknown>>> {
    return this.page(this.db.orderExceptionCase, query, ['exceptionNo', 'category', 'summary']);
  }

  createRiskReport(input: CreateRiskReportDto & { summary: string; metrics: Record<string, unknown> }): Promise<Record<string, unknown>> {
    return this.db.riskReport.create({
      data: {
        reportNo: `RR${Date.now()}`,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        summary: input.summary,
        metrics: input.metrics
      }
    });
  }

  async getRiskReport(): Promise<Record<string, unknown>> {
    const [
      pendingProfileReviews,
      pendingComplaints,
      activeBlacklist,
      openExceptions,
      highRiskEvents
    ] = await Promise.all([
      this.db.publicProfileReview.count({ where: { status: { in: ['pending', 'risk_hold'] } } }),
      this.db.complaint.count({ where: { status: { in: ['pending', 'processing'] } } }),
      this.db.blacklistEntry.count({ where: { status: 'active' } }),
      this.db.orderExceptionCase.count({ where: { status: { in: ['open', 'processing'] } } }),
      this.db.riskEvent.count({ where: { riskLevel: { in: ['high', 'critical'] }, status: { in: ['pending', 'processing'] } } })
    ]);
    return {
      pendingProfileReviews,
      pendingComplaints,
      activeBlacklist,
      openExceptions,
      highRiskEvents
    };
  }

  async createAuditLog(input: {
    actorId?: string;
    actorType: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    beforeData?: Record<string, unknown>;
    afterData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.auditLog.create({ data: input });
  }

  private async page(model: any, query: PageQueryDto, searchable: string[]): Promise<PageResult<Record<string, unknown>>> {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 10);
    const where: Record<string, unknown> = {
      ...(query.status ? { status: query.status } : {})
    };
    if (query.keyword) {
      where.OR = searchable.map(field => ({ [field]: { contains: query.keyword, mode: 'insensitive' } }));
    }
    const [list, total] = await Promise.all([
      model.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      model.count({ where })
    ]);
    return { list, total };
  }
}
