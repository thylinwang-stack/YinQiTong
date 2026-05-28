import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/errors/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthService } from '@/modules/auth/auth.service';
import { AdminBookingQueryDto, CreateBookingDto, PublicAssistantQueryDto, SupportRequestDto } from './dto/public-api.dto';

type PrismaLike = PrismaService & { [key: string]: any };

const FALLBACK_SCENES = [
  {
    id: 'business_dinner',
    code: 'business_dinner',
    name: '商务宴请',
    summary: '适合客户宴请、合作方接待、重要项目沟通。',
    description: '围绕正式商务会面提供餐前准备、礼宾接待和现场氛围协同。',
    cover: '/assets/images/home-concierge-hero.jpg',
    tags: ['自然开场', '礼宾协同'],
    serviceScope: ['餐前 brief', '现场协同', '服务复盘']
  },
  {
    id: 'client_reception',
    code: 'client_reception',
    name: '客户接待',
    summary: '适合外地客户到访、城市接待和轻商务陪同。',
    description: '协助客户到访接待、动线提醒和轻商务沟通。',
    cover: '/assets/images/home-concierge-hero.jpg',
    tags: ['城市礼宾', '得体接待'],
    serviceScope: ['接待动线', '话题准备', '边界提醒']
  }
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PublicApiService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaLike,
    private readonly authService: AuthService
  ) {}

  async listScenes() {
    const rows = await this.db.serviceScene.findMany({
      where: { status: 'published' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });
    if (!rows.length) return FALLBACK_SCENES;
    return rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      summary: row.summary,
      description: row.description,
      cover: row.cover || '',
      tags: row.tags || [],
      serviceScope: row.serviceScope || []
    }));
  }

  async listPackages(sceneId?: string) {
    const sceneFilter = await this.resolveSceneId(sceneId);
    const rows = sceneId && !sceneFilter
      ? []
      : await this.db.servicePackage.findMany({
        where: { status: 'published', ...(sceneFilter ? { sceneId: sceneFilter } : {}) },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      });
    if (!rows.length) {
      return [
        {
          id: 'pkg_business_standard',
          sceneId: sceneId || 'business_dinner',
          name: '重要客户接待',
          subtitle: '2 位商务助理，专属餐前准备，主管复核 brief',
          durationHours: 3,
          assistantCount: 2,
          depositAmount: 1200,
          serviceFee: 6800,
          includes: ['餐前 brief', '现场礼宾协同', '服务后复盘']
        }
      ];
    }
    return rows.map((row: any) => ({
      id: row.id,
      sceneId: row.sceneId,
      name: row.name,
      subtitle: row.subtitle || '',
      durationHours: row.durationHours,
      assistantCount: row.assistantCount,
      depositAmount: Number(row.depositAmount),
      serviceFee: Number(row.serviceFee),
      includes: row.includes || []
    }));
  }

  async listPublicAssistants(query: PublicAssistantQueryDto) {
    const rows = await this.db.assistantPublicProfile.findMany({
      where: {
        profileStatus: 'approved',
        imageAuditStatus: 'approved',
        ...(query.city ? { city: query.city } : {})
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });
    const filtered = rows.filter((row: any) => {
      const sceneSkills = row.sceneSkills || [];
      const styleTags = row.styleTags || [];
      return (!query.scene || sceneSkills.includes(query.scene)) && (!query.styleTag || styleTags.includes(query.styleTag));
    });
    return filtered.map((row: any) => this.toPublicAssistant(row));
  }

  async getPublicAssistant(id: string) {
    const row = await this.db.assistantPublicProfile.findFirst({
      where: {
        OR: [
          ...(UUID_PATTERN.test(id) ? [{ id }, { assistantId: id }] : []),
          { assistantNo: id }
        ],
        profileStatus: 'approved',
        imageAuditStatus: 'approved'
      }
    });
    if (!row) throw new BusinessException('ASSISTANT_PUBLIC_PROFILE_NOT_FOUND', '商务助理公开资料不存在或未审核通过');
    return this.toPublicAssistant(row);
  }

  async createBooking(dto: CreateBookingDto, authorization?: string) {
    if (!dto.boundaryAgreementConfirmed) {
      throw new BusinessException('BOUNDARY_AGREEMENT_REQUIRED', '请先确认服务边界协议');
    }
    const user = await this.optionalUser(authorization);
    const customer = await this.ensureCustomer(user);
    const scene = await this.findScene(dto.sceneId, dto.dinnerType);
    const pkg = await this.findPackage(dto.packageId);
    const serviceFee = Number(pkg?.serviceFee || dto.budget);
    const depositAmount = Number(pkg?.depositAmount || Math.max(300, Math.round(serviceFee * 0.2)));
    const serviceDate = this.parseServiceDate(dto.date, dto.time);
    const orderNo = this.makeNo('BS');
    const bookingNo = this.makeNo('BK');

    const result = await this.db.$transaction(async tx => {
      const order = await tx.order.create({
        data: {
          orderNo,
          customerId: customer?.id,
          status: 'deposit_pending',
          totalAmount: serviceFee,
          depositAmount,
          paidAmount: 0
        }
      });
      const booking = await tx.booking.create({
        data: {
          bookingNo,
          orderId: order.id,
          customerId: customer?.id,
          sceneId: scene?.id,
          packageId: pkg?.id,
          status: 'deposit_pending',
          city: dto.city,
          serviceDate,
          serviceTimeText: `${dto.date} ${dto.time}`,
          dinnerType: dto.dinnerType,
          guestCount: dto.guestCount,
          assistantCount: dto.assistantCount,
          budget: dto.budget,
          preference: dto.preference,
          taboos: dto.taboos,
          remark: dto.remark,
          protocolVersion: dto.protocolVersion || 'service_boundary_v1',
          boundaryAgreementConfirmed: true
        }
      });
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: 'draft',
          toStatus: 'deposit_pending',
          trigger: 'booking_created',
          actorType: 'customer',
          actorId: user?.id,
          metadata: { bookingId: booking.id }
        }
      });
      await tx.auditLog.create({
        data: {
          actorId: user?.id,
          actorType: user ? 'customer' : 'anonymous',
          action: 'booking.create',
          resourceType: 'booking',
          resourceId: booking.id,
          afterData: booking,
          metadata: { orderId: order.id, orderNo }
        }
      });
      return { booking, order };
    });

    return { bookingId: result.booking.id, order: this.toClientOrder(result.order, result.booking, scene) };
  }

  async listMyOrders(authorization?: string) {
    const user = await this.authService.getUserFromAuthorization(authorization);
    const customer = await this.db.customer.findUnique({ where: { userId: user.id } });
    if (!customer) return [];
    const orders = await this.db.order.findMany({
      where: { customerId: customer.id },
      include: { booking: { include: { scene: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return orders.map((order: any) => this.toClientOrder(order, order.booking, order.booking?.scene));
  }

  async getBookingOrder(id: string, authorization?: string) {
    const user = await this.authService.getUserFromAuthorization(authorization);
    const order = await this.db.order.findFirst({
      where: { OR: [...(UUID_PATTERN.test(id) ? [{ id }] : []), { orderNo: id }] },
      include: { customer: true, booking: { include: { scene: true } } }
    });
    if (!order) throw new BusinessException('ORDER_NOT_FOUND', '订单不存在');
    if (user.userType === 'customer' && order.customer?.userId !== user.id) {
      throw new BusinessException('ORDER_ACCESS_DENIED', '无权查看该订单', HttpStatus.FORBIDDEN);
    }
    return this.toClientOrder(order, order.booking, order.booking?.scene);
  }

  async createSupportRequest(id: string, dto: SupportRequestDto, authorization?: string) {
    const user = await this.authService.getUserFromAuthorization(authorization);
    const order = await this.db.order.findFirst({
      where: { OR: [...(UUID_PATTERN.test(id) ? [{ id }] : []), { orderNo: id }] },
      include: { customer: true, booking: { include: { scene: true } } }
    });
    if (!order) throw new BusinessException('ORDER_NOT_FOUND', '订单不存在');
    if (user.userType === 'customer' && order.customer?.userId !== user.id) {
      throw new BusinessException('ORDER_ACCESS_DENIED', '无权操作该订单', HttpStatus.FORBIDDEN);
    }

    await this.db.auditLog.create({
      data: {
        actorId: user.id,
        actorType: user.userType || 'customer',
        action: 'booking.support_request',
        resourceType: 'order',
        resourceId: order.id,
        metadata: {
          orderNo: order.orderNo,
          requestType: dto.type,
          content: dto.content || ''
        }
      }
    });

    return {
      accepted: true,
      message: this.supportRequestMessage(dto.type)
    };
  }

  async listAdminBookings(query: AdminBookingQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const orderStatus = this.fromClientStatus(query.status);
    const where: Record<string, unknown> = {
      ...(orderStatus ? { status: orderStatus } : {})
    };
    const bookingWhere: Record<string, unknown> = {
      ...(query.city ? { city: query.city } : {})
    };
    if (query.keyword) {
      where.OR = [
        { orderNo: { contains: query.keyword } },
        { booking: { is: { bookingNo: { contains: query.keyword } } } },
        { booking: { is: { dinnerType: { contains: query.keyword } } } }
      ];
    }
    const bookingFilter = Object.keys(bookingWhere).length ? { booking: { is: bookingWhere } } : {};
    const [total, rows] = await Promise.all([
      this.db.order.count({ where: { ...where, ...bookingFilter } }),
      this.db.order.findMany({
        where: { ...where, ...bookingFilter },
        include: { customer: true, booking: { include: { scene: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    return {
      items: rows.map((order: any) => ({
        id: order.id,
        orderNo: order.orderNo,
        customerName: order.customer?.name || '待补充客户',
        sceneName: order.booking?.scene?.name || order.booking?.dinnerType || '商务接待',
        city: order.booking?.city || '',
        serviceTime: order.booking?.serviceTimeText || '',
        assistantCount: order.booking?.assistantCount || 1,
        amount: Number(order.totalAmount || 0),
        status: this.toClientStatus(order.status),
        manager: '运营待分配',
        riskLevel: 'low',
        timeline: [
          {
            status: this.toClientStatus(order.status),
            title: `当前状态：${order.status}`,
            time: order.updatedAt?.toISOString?.() || '',
            operator: 'system'
          }
        ]
      })),
      total,
      page,
      pageSize
    };
  }

  private toPublicAssistant(row: any) {
    return {
      id: row.id,
      assistantNo: row.assistantNo,
      workName: row.workName,
      city: row.city,
      avatarUrl: row.avatarUrl || '',
      styleTags: row.styleTags || [],
      sceneSkills: row.sceneSkills || [],
      businessSkills: row.businessSkills || [],
      intro: row.publicIntro || '',
      complianceNote: row.complianceNote || '公开资料已审核，不展示私人联系方式。'
    };
  }

  private toClientOrder(order: any, booking?: any, scene?: any) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: this.toClientStatus(order.status),
      sceneName: scene?.name || booking?.dinnerType || '商务接待',
      city: booking?.city || '',
      serviceTime: booking?.serviceTimeText || '',
      assistantCount: booking?.assistantCount || 1,
      depositAmount: Number(order.depositAmount || 0),
      serviceFee: Number(order.totalAmount || 0),
      paidAmount: Number(order.paidAmount || 0),
      createdAt: order.createdAt?.toISOString?.() || String(order.createdAt || ''),
      boundaryConfirmed: Boolean(booking?.boundaryAgreementConfirmed)
    };
  }

  private toClientStatus(status: string) {
    const map: Record<string, string> = {
      draft: 'pending_payment',
      submitted: 'pending_payment',
      consulting: 'pending_payment',
      quoted: 'pending_payment',
      deposit_pending: 'pending_payment',
      deposit_paid: 'pending_match',
      matching: 'pending_match',
      confirmed: 'matched',
      prep: 'brief_preparing',
      executing: 'in_service',
      completed: 'completed',
      reviewed: 'completed',
      settlement_pending: 'completed',
      settled: 'completed',
      cancelled: 'cancelled',
      refunded: 'cancelled',
      exception: 'cancelled'
    };
    return map[status] || 'pending_payment';
  }

  private supportRequestMessage(type: string) {
    const map: Record<string, string> = {
      contact_service: '客服请求已记录，平台将在服务时段前与你确认。',
      reschedule: '改期申请已记录，客服会确认档期与费用差异。',
      cancel: '取消申请已记录，请等待客服确认可退金额。',
      refund: '退款申请已记录，请等待客服核对支付状态。',
      invoice: '发票申请已记录，客服会与你确认抬头信息。',
      add_requirement: '补充需求已记录，运营会同步给匹配与 brief 流程。'
    };
    return map[type] || '服务请求已记录，客服会尽快处理。';
  }

  private fromClientStatus(status?: string) {
    if (!status) return undefined;
    const map: Record<string, string> = {
      pending_payment: 'deposit_pending',
      pending_match: 'matching',
      matched: 'confirmed',
      brief_preparing: 'prep',
      ready_for_service: 'prep',
      in_service: 'executing',
      completed: 'completed',
      cancelled: 'cancelled',
      risk_hold: 'exception'
    };
    return map[status] || status;
  }

  private async optionalUser(authorization?: string) {
    try {
      return await this.authService.getUserFromAuthorization(authorization);
    } catch {
      return undefined;
    }
  }

  private async ensureCustomer(user?: any) {
    if (!user) return undefined;
    const existed = await this.db.customer.findUnique({ where: { userId: user.id } });
    if (existed) return existed;
    return this.db.customer.create({
      data: {
        userId: user.id,
        name: user.nickname || user.username,
        phone: user.phone
      }
    });
  }

  private parseServiceDate(date: string, time: string) {
    const parsed = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private makeNo(prefix: string) {
    const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    return `${prefix}${stamp}${Math.floor(Math.random() * 900 + 100)}`;
  }

  private async findScene(sceneId?: string, dinnerType?: string) {
    if (sceneId) {
      return this.db.serviceScene.findFirst({
        where: {
          OR: [
            ...(UUID_PATTERN.test(sceneId) ? [{ id: sceneId }] : []),
            { code: sceneId }
          ]
        }
      });
    }
    return dinnerType ? this.db.serviceScene.findFirst({ where: { name: dinnerType } }) : null;
  }

  private async findPackage(packageId?: string) {
    if (!packageId || !UUID_PATTERN.test(packageId)) return null;
    return this.db.servicePackage.findUnique({ where: { id: packageId } });
  }

  private async resolveSceneId(sceneId?: string) {
    if (!sceneId) return undefined;
    if (UUID_PATTERN.test(sceneId)) return sceneId;
    const scene = await this.db.serviceScene.findUnique({ where: { code: sceneId }, select: { id: true } });
    return scene?.id;
  }
}
