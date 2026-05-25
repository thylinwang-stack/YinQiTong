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

export interface PageResult<T> {
  list: T[];
  total: number;
}

export interface RiskComplianceRepository {
  transaction<T>(handler: (repo: RiskComplianceRepository) => Promise<T>): Promise<T>;
  listSensitiveWords(query: PageQueryDto): Promise<PageResult<Record<string, unknown>>>;
  getActiveSensitiveWords(): Promise<SensitiveWordRule[]>;
  upsertSensitiveWord(id: string | undefined, input: UpsertSensitiveWordDto): Promise<Record<string, unknown>>;
  recordRiskEvent(input: {
    eventType: string;
    bizType: string;
    bizId?: string;
    riskLevel: string;
    summary: string;
    detail: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;
  submitProfileReview(input: SubmitProfileReviewDto & { detection: RiskDetectionResult }): Promise<Record<string, unknown>>;
  decideProfileReview(id: string, input: DecideProfileReviewDto): Promise<Record<string, unknown>>;
  listProfileReviews(query: PageQueryDto): Promise<PageResult<Record<string, unknown>>>;
  confirmProtocol(input: {
    orderId: string;
    actorType: string;
    actorId?: string;
    protocolVersion: string;
    ip?: string;
    userAgent?: string;
  }): Promise<Record<string, unknown>>;
  countProtocolConfirmations(orderId: string): Promise<{ customer: number; assistant: number }>;
  createComplaint(input: CreateComplaintDto): Promise<Record<string, unknown>>;
  updateComplaint(id: string, input: UpdateComplaintDto): Promise<Record<string, unknown>>;
  listComplaints(query: PageQueryDto): Promise<PageResult<Record<string, unknown>>>;
  createBlacklistEntry(input: CreateBlacklistEntryDto): Promise<Record<string, unknown>>;
  updateBlacklistEntry(id: string, input: UpdateBlacklistEntryDto): Promise<Record<string, unknown>>;
  listBlacklist(query: PageQueryDto): Promise<PageResult<Record<string, unknown>>>;
  createOrderException(input: CreateOrderExceptionDto): Promise<Record<string, unknown>>;
  updateOrderException(id: string, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  listOrderExceptions(query: PageQueryDto): Promise<PageResult<Record<string, unknown>>>;
  createRiskReport(input: CreateRiskReportDto & { summary: string; metrics: Record<string, unknown> }): Promise<Record<string, unknown>>;
  getRiskReport(): Promise<Record<string, unknown>>;
  createAuditLog(input: {
    actorId?: string;
    actorType: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    beforeData?: Record<string, unknown>;
    afterData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export const RISK_COMPLIANCE_REPOSITORY = Symbol('RISK_COMPLIANCE_REPOSITORY');
