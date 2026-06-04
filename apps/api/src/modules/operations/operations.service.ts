import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

type PrismaLike = PrismaService & { [key: string]: any };

export interface CityOperationSummary {
  city: string;
  assistantPool: number;
  availableToday: number;
  utilizationRate: number;
  complaintRate: number;
  coverageStatus: string;
  responseSlaMinutes: number;
  note: string;
}

export interface OperationsHubSummary {
  cities: CityOperationSummary[];
  fulfillmentQueue: Array<Record<string, unknown>>;
  serviceReviews: Array<Record<string, unknown>>;
}

interface PageQuery {
  page?: unknown;
  pageSize?: unknown;
  keyword?: unknown;
  status?: unknown;
}

@Injectable()
export class OperationsService {
  constructor(@Inject(PrismaService) private readonly db: PrismaLike) {}

  async getHub(): Promise<OperationsHubSummary> {
    const [cities, fulfillmentQueue, serviceReviews] = await Promise.all([
      this.getCityOperations(),
      this.getFulfillmentQueue(),
      this.getServiceReviews()
    ]);

    return {
      cities,
      fulfillmentQueue,
      serviceReviews
    };
  }

  async listFinance(query: PageQuery) {
    const [payments, refunds, settlements] = await Promise.all([
      this.db.payment.findMany({
        include: { order: true },
        orderBy: [{ createdAt: 'desc' }],
        take: 200
      }),
      this.db.refund.findMany({
        include: { order: true },
        orderBy: [{ createdAt: 'desc' }],
        take: 200
      }),
      this.db.settlement.findMany({
        include: { order: true },
        orderBy: [{ createdAt: 'desc' }],
        take: 200
      })
    ]);
    const records = [
      ...payments.map((item: any) => ({
        id: item.id,
        no: item.paymentNo,
        type: 'payment',
        orderNo: item.order?.orderNo || '',
        subject: item.subject,
        amount: Number(item.amount || 0),
        status: item.status,
        provider: item.provider,
        createdAt: this.formatDateTime(item.createdAt)
      })),
      ...refunds.map((item: any) => ({
        id: item.id,
        no: item.refundNo,
        type: 'refund',
        orderNo: item.order?.orderNo || '',
        subject: item.reason || '退款申请',
        amount: Number(item.amount || 0),
        status: item.status,
        provider: 'wechat_pay',
        createdAt: this.formatDateTime(item.createdAt)
      })),
      ...settlements.map((item: any) => ({
        id: item.id,
        no: item.settlementNo,
        type: 'settlement',
        orderNo: item.order?.orderNo || '',
        subject: item.remark || '服务结算',
        amount: Number(item.amount || 0),
        status: item.status,
        provider: 'internal',
        createdAt: this.formatDateTime(item.createdAt)
      }))
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return this.page(records, query);
  }

  async listApprovals(query: PageQuery) {
    const approvals = await this.db.approval.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 300
    });
    return this.page(approvals.map((item: any) => ({
      id: item.id,
      approvalNo: item.approvalNo,
      bizType: item.bizType,
      title: item.title,
      applicant: item.applicantId || '系统',
      status: item.status,
      amount: item.amount == null ? undefined : Number(item.amount),
      createdAt: this.formatDateTime(item.createdAt),
      remark: item.remark || undefined
    })), query);
  }

  async decideApproval(id: string, body: { action: 'approved' | 'rejected'; remark?: string }, actorId?: string) {
    const approval = await this.db.approval.update({
      where: { id },
      data: {
        status: body.action,
        remark: body.remark,
        decidedBy: actorId,
        decidedAt: new Date()
      }
    });
    await this.db.auditLog.create({
      data: {
        actorId,
        actorType: 'admin',
        action: `approval.${body.action}`,
        resourceType: 'approval',
        resourceId: approval.id,
        afterData: { status: approval.status, remark: approval.remark },
        metadata: { approvalNo: approval.approvalNo }
      }
    });
    return {
      id: approval.id,
      approvalNo: approval.approvalNo,
      bizType: approval.bizType,
      title: approval.title,
      applicant: approval.applicantId || '系统',
      status: approval.status,
      amount: approval.amount == null ? undefined : Number(approval.amount),
      createdAt: this.formatDateTime(approval.createdAt),
      remark: approval.remark || undefined
    };
  }

  async listRoles() {
    const roles = await this.db.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: [{ code: 'asc' }]
    });
    return roles.map((role: any) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((item: any) => item.permission.code)
    }));
  }

  async updateRolePermissions(id: string, permissions: string[], actorId?: string) {
    const existing = await this.db.permission.findMany({ where: { code: { in: permissions } } });
    await this.db.$transaction([
      this.db.rolePermission.deleteMany({ where: { roleId: id } }),
      this.db.rolePermission.createMany({
        data: existing.map((permission: any) => ({ roleId: id, permissionId: permission.id })),
        skipDuplicates: true
      }),
      this.db.auditLog.create({
        data: {
          actorId,
          actorType: 'admin',
          action: 'role.update_permissions',
          resourceType: 'role',
          resourceId: id,
          afterData: { permissions },
          metadata: { matchedPermissions: existing.length }
        }
      })
    ]);
    return (await this.listRoles()).find((item: any) => item.id === id);
  }

  async listAuditLogs(query: PageQuery) {
    const logs = await this.db.auditLog.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 500
    });
    return this.page(logs.map((item: any) => ({
      id: item.id,
      actor: item.actorType || item.actorId || 'system',
      action: item.action,
      resourceType: item.resourceType,
      resourceId: item.resourceId || '',
      ip: item.metadata?.ip || '',
      createdAt: this.formatDateTime(item.createdAt),
      metadata: item.metadata || {}
    })), query);
  }

  private async getCityOperations(): Promise<CityOperationSummary[]> {
    const { start, end } = this.todayRange();
    const [assistantGroups, availabilityGroups, complaintGroups] = await Promise.all([
      this.db.assistant.groupBy({
        by: ['city'],
        where: { status: 'active' },
        _count: { _all: true }
      }),
      this.db.assistantAvailability.groupBy({
        by: ['city'],
        where: {
          status: 'available',
          startAt: { lte: end },
          endAt: { gte: start }
        },
        _count: { _all: true }
      }),
      this.db.complaint.groupBy({
        by: ['status'],
        where: { createdAt: { gte: this.daysAgo(30) } },
        _count: { _all: true }
      })
    ]);

    const complaintTotal = complaintGroups.reduce((sum: number, item: any) => sum + Number(item._count?._all || 0), 0);
    const availableByCity = new Map<string, number>(
      availabilityGroups.map((item: any) => [item.city, Number(item._count?._all || 0)])
    );

    return assistantGroups.map((item: any) => {
      const assistantPool = Number(item._count?._all || 0);
      const availableToday = availableByCity.get(item.city) || 0;
      const utilizationRate = assistantPool ? Math.round(((assistantPool - availableToday) / assistantPool) * 100) : 0;
      const complaintRate = assistantPool ? Number(((complaintTotal / Math.max(assistantPool, 1)) * 0.1).toFixed(1)) : 0;
      const coverageStatus = utilizationRate >= 90 ? 'at_risk' : utilizationRate >= 82 ? 'constrained' : 'healthy';
      return {
        city: item.city,
        assistantPool,
        availableToday,
        utilizationRate,
        complaintRate,
        coverageStatus,
        responseSlaMinutes: this.estimateSlaMinutes(coverageStatus),
        note: this.cityOperationNote(item.city, coverageStatus)
      };
    });
  }

  private async getFulfillmentQueue() {
    const orders = await this.db.order.findMany({
      where: {
        status: {
          in: ['deposit_paid', 'matching', 'confirmed', 'prep', 'executing', 'completed', 'reviewed', 'exception']
        }
      },
      include: {
        customer: true,
        booking: { include: { scene: true, assistants: true } },
        mealBrief: { include: { tasks: true, review: true } },
        exceptionCases: {
          where: { status: { in: ['open', 'processing'] } },
          take: 1
        }
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 12
    });

    return orders.map((order: any) => {
      const briefStatus = order.mealBrief?.status || 'draft';
      const assignedCount = order.booking?.assistants?.length || 0;
      return {
        id: order.id,
        orderNo: order.orderNo,
        customerName: order.customer?.name || '未命名客户',
        city: order.booking?.city || order.customer?.city || '',
        sceneName: order.booking?.scene?.name || order.booking?.dinnerType || '商务接待',
        serviceTime: order.booking?.serviceTimeText || this.formatDateTime(order.booking?.serviceDate),
        stage: this.toAdminOrderStage(order.status),
        briefStatus,
        assistantStatus: this.toAssistantStatus(order.status, assignedCount, order.mealBrief),
        riskLevel: order.status === 'exception' || order.exceptionCases?.length ? 'high' : 'normal',
        owner: '运营',
        nextAction: this.nextAction(order.status, briefStatus, assignedCount)
      };
    });
  }

  private async getServiceReviews() {
    const reviews = await this.db.mealBriefReview.findMany({
      include: {
        mealBrief: {
          include: {
            order: {
              include: {
                customer: true,
                booking: {
                  include: {
                    assistants: {
                      take: 1,
                      include: {
                        assistant: { include: { publicProfile: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 10
    });

    return reviews.map((review: any) => {
      const order = review.mealBrief?.order;
      const assistant = order?.booking?.assistants?.[0]?.assistant;
      const rating = Number(review.rating || 0);
      const summary = this.parseReviewSummary(review.internalSummary);
      return {
        id: review.id,
        orderNo: order?.orderNo || '',
        customerName: order?.customer?.name || '未命名客户',
        assistantNo: assistant?.assistantNo || '待匹配',
        assistantName: assistant?.publicProfile?.workName || assistant?.assistantNo || '待匹配',
        city: order?.booking?.city || order?.customer?.city || '',
        overallRating: rating,
        boundarySenseRating: rating,
        atmosphereRating: rating,
        highlightTags: summary.highlightTags?.length ? summary.highlightTags : rating >= 5 ? ['分寸得体', '自然控场'] : ['需复盘'],
        repurchaseIntent: this.toRepurchaseText(summary.repurchaseIntent),
        status: rating >= 5 ? 'excellent' : 'follow_up',
        submittedAt: this.formatDateTime(review.createdAt),
        followUpRequired: summary.allowFollowUp === true || (rating > 0 && rating < 5),
        internalNote: review.customerFeedback || '待补充复盘'
      };
    });
  }

  private todayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private daysAgo(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private estimateSlaMinutes(status: string) {
    if (status === 'at_risk') return 30;
    if (status === 'constrained') return 22;
    return 15;
  }

  private cityOperationNote(city: string, status: string) {
    if (status === 'at_risk') return `${city}供给偏紧，建议提前锁定沉稳、国际化和控场型助理档期。`;
    if (status === 'constrained') return `${city}需求集中，重点客户接待需前置确认备选助理。`;
    return `${city}供给稳定，可按客户等级和场景标签做精细匹配。`;
  }

  private toAdminOrderStage(status: string) {
    const map: Record<string, string> = {
      deposit_paid: 'pending_match',
      matching: 'pending_match',
      confirmed: 'matched',
      prep: 'brief_preparing',
      executing: 'in_service',
      completed: 'review_pending',
      reviewed: 'reviewed',
      exception: 'risk_hold'
    };
    return map[status] || status;
  }

  private toAssistantStatus(status: string, assignedCount: number, mealBrief?: any) {
    if (!assignedCount) return 'pending_confirm';
    if (status === 'completed' || status === 'reviewed') return 'done';
    if (mealBrief?.assistantConfirmedAt || mealBrief?.status === 'assistant_confirmed') return 'assistant_confirmed';
    return 'pending_confirm';
  }

  private nextAction(status: string, briefStatus: string, assignedCount: number) {
    if (status === 'exception') return '由风控先处理异常，再决定是否继续履约';
    if (!assignedCount) return '确认助理档期并保留备选人选';
    if (['draft', 'submitted'].includes(briefStatus)) return '完善餐前 brief，并完成运营审核';
    if (status === 'completed') return '发送客户评价链接并启动服务复盘';
    if (status === 'reviewed') return '进入结算与助理服务质量归档';
    return '按服务时间推进提醒、签到和现场反馈';
  }

  private formatDateTime(value?: Date | string | null) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (input: number) => String(input).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private parseReviewSummary(value?: string | null): Record<string, any> {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  private toRepurchaseText(value?: string) {
    const map: Record<string, string> = {
      yes: '愿意',
      maybe: '视场景',
      no: '暂不'
    };
    return value ? map[value] || value : '未选择';
  }

  private page<T extends Record<string, any>>(records: T[], query: PageQuery) {
    const keyword = String(query.keyword || '').trim();
    const status = String(query.status || '').trim();
    const filtered = records.filter(record => {
      const text = JSON.stringify(record);
      return (!keyword || text.includes(keyword)) && (!status || record.status === status);
    });
    const pageNo = Math.max(1, Number(query.page || 1));
    const pageSize = Math.max(1, Number(query.pageSize || 10));
    const start = (pageNo - 1) * pageSize;
    return {
      list: filtered.slice(start, start + pageSize),
      total: filtered.length
    };
  }
}
