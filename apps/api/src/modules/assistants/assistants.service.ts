import { Inject, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { BusinessException } from '@/common/errors/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import { ImageAuditStatus } from '@/modules/risk-compliance/risk.enums';
import { DEFAULT_SENSITIVE_WORDS, detectSensitiveContent } from '@/modules/risk-compliance/risk-detector';
import { AssistantPhotoType, AssistantStatus } from './assistant.enums';
import {
  AssistantQueryDto,
  CreateAssistantDto,
  UpdateAssistantInternalProfileDto,
  UpdateAssistantPhotoAuditDto,
  UpdateAssistantPublicProfileDto,
  UploadAssistantPhotoDto
} from './dto/assistant.dto';

type PrismaLike = any;

@Injectable()
export class AssistantsService {
  constructor(@Inject(PrismaService) private readonly db: PrismaLike) {}

  async list(query: AssistantQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const where: Record<string, unknown> = {
      ...(query.city ? { city: query.city } : {}),
      ...(query.status ? { status: query.status } : {})
    };

    if (query.keyword) {
      where.OR = [
        { assistantNo: { contains: query.keyword } },
        { realName: { contains: query.keyword } },
        { phone: { contains: query.keyword } },
        { city: { contains: query.keyword } }
      ];
    }

    const [total, items] = await Promise.all([
      this.db.assistant.count({ where }),
      this.db.assistant.findMany({
        where,
        include: {
          internalProfile: true,
          publicProfile: true,
          photos: { orderBy: { createdAt: 'desc' }, take: 4 }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return { items, total, page, pageSize };
  }

  async get(id: string) {
    const assistant = await this.db.assistant.findUnique({
      where: { id },
      include: {
        internalProfile: true,
        publicProfile: true,
        photos: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!assistant) throw new BusinessException('ASSISTANT_NOT_FOUND', '商务助理不存在');
    return assistant;
  }

  async create(dto: CreateAssistantDto) {
    const assistantNo = dto.assistantNo || `BA-${Date.now().toString().slice(-6)}`;
    return this.db.$transaction(async tx => {
      const assistant = await tx.assistant.create({
        data: {
          assistantNo,
          realName: dto.realName,
          phone: dto.phone,
          city: dto.city,
          status: dto.status || AssistantStatus.Pending,
          internalLevel: dto.internalLevel,
          source: dto.source,
          joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
          internalProfile: {
            create: {
              legalName: dto.realName,
              phone: dto.phone,
              managerPrivateNote: dto.managerPrivateNote
            }
          }
        },
        include: { internalProfile: true }
      });
      await this.audit(tx, 'assistant.create', 'assistant', assistant.id, undefined, assistant);
      return assistant;
    });
  }

  async updateInternalProfile(id: string, dto: UpdateAssistantInternalProfileDto) {
    await this.ensureAssistant(id);
    return this.db.$transaction(async tx => {
      const before = await tx.assistant.findUnique({
        where: { id },
        include: { internalProfile: true }
      });
      const assistant = await tx.assistant.update({
        where: { id },
        data: {
          realName: dto.realName,
          phone: dto.phone,
          city: dto.city,
          status: dto.status,
          internalLevel: dto.internalLevel
        }
      });
      const internalProfile = await tx.assistantInternalProfile.upsert({
        where: { assistantId: id },
        create: {
          assistantId: id,
          legalName: dto.legalName || dto.realName,
          idNumberMasked: dto.idNumberMasked,
          phone: dto.phone,
          emergencyContact: dto.emergencyContact,
          workExperience: dto.workExperience,
          trainingNotes: dto.trainingNotes,
          managerPrivateNote: dto.managerPrivateNote
        },
        update: {
          legalName: dto.legalName,
          idNumberMasked: dto.idNumberMasked,
          phone: dto.phone,
          emergencyContact: dto.emergencyContact,
          workExperience: dto.workExperience,
          trainingNotes: dto.trainingNotes,
          managerPrivateNote: dto.managerPrivateNote
        }
      });
      const after = { ...assistant, internalProfile };
      await this.audit(tx, 'assistant.internal_profile.update', 'assistant', id, before, after);
      return after;
    });
  }

  async updatePublicProfile(id: string, dto: UpdateAssistantPublicProfileDto) {
    const assistant = await this.ensureAssistant(id);
    const snapshot = {
      workName: dto.workName,
      city: dto.city,
      styleTags: dto.styleTags || [],
      sceneSkills: dto.sceneSkills || [],
      businessSkills: dto.businessSkills || [],
      publicIntro: dto.publicIntro,
      complianceNote: dto.complianceNote
    };
    const detection = detectSensitiveContent(JSON.stringify(snapshot), DEFAULT_SENSITIVE_WORDS);

    return this.db.$transaction(async tx => {
      const before = await tx.assistantPublicProfile.findUnique({ where: { assistantId: id } });
      const imageAuditStatus = before?.imageAuditStatus || ImageAuditStatus.Pending;
      const profileStatus = detection.safe ? 'pending' : 'risk_hold';
      const publicProfile = await tx.assistantPublicProfile.upsert({
        where: { assistantId: id },
        create: {
          assistantId: id,
          assistantNo: assistant.assistantNo,
          workName: dto.workName,
          city: dto.city,
          avatarUrl: dto.avatarUrl,
          imageAuditStatus,
          profileStatus,
          styleTags: dto.styleTags || [],
          sceneSkills: dto.sceneSkills || [],
          businessSkills: dto.businessSkills || [],
          publicIntro: dto.publicIntro,
          complianceNote: dto.complianceNote
        },
        update: {
          workName: dto.workName,
          city: dto.city,
          avatarUrl: dto.avatarUrl,
          profileStatus,
          styleTags: dto.styleTags || [],
          sceneSkills: dto.sceneSkills || [],
          businessSkills: dto.businessSkills || [],
          publicIntro: dto.publicIntro,
          complianceNote: dto.complianceNote
        }
      });

      const review = await tx.publicProfileReview.create({
        data: {
          assistantId: id,
          profileId: publicProfile.id,
          contentSnapshot: snapshot,
          findings: detection.hits,
          riskLevel: detection.level,
          status: profileStatus,
          imageAuditStatus
        }
      });

      if (!detection.safe) {
        await tx.riskEvent.create({
          data: {
            eventNo: `RISK${Date.now()}`,
            eventType: 'assistant_public_profile_hit',
            bizType: 'assistant_profile',
            bizId: id,
            riskLevel: detection.level,
            summary: '商务助理对外资料命中敏感内容',
            detail: { hits: detection.hits, sanitizedText: detection.sanitizedText }
          }
        });
      }

      await this.audit(tx, 'assistant.public_profile.update', 'assistant_public_profile', publicProfile.id, before, publicProfile, {
        reviewId: review.id,
        safe: detection.safe,
        riskLevel: detection.level
      });
      return { publicProfile, review, detection };
    });
  }

  async uploadPhoto(id: string, dto: UploadAssistantPhotoDto, file?: any) {
    await this.ensureAssistant(id);
    if (!file) throw new BusinessException('ASSISTANT_PHOTO_REQUIRED', '请上传照片文件');
    if (!String(file.mimetype || '').startsWith('image/')) {
      throw new BusinessException('ASSISTANT_PHOTO_INVALID_TYPE', '仅支持图片文件');
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new BusinessException('ASSISTANT_PHOTO_TOO_LARGE', '图片不能超过 8MB');
    }

    const safeName = String(file.originalname || 'photo').replace(/[^\w.-]/g, '_');
    const storageKey = `assistants/${id}/${Date.now()}-${safeName}`;
    await this.persistPhoto(storageKey, file);
    const publicBaseUrl = process.env.PUBLIC_UPLOAD_BASE_URL || '/uploads';
    const publicUrl = `${publicBaseUrl.replace(/\/$/, '')}/${storageKey}`;
    const photoType = dto.photoType || AssistantPhotoType.Profile;

    return this.db.$transaction(async tx => {
      const photo = await tx.assistantPhoto.create({
        data: {
          assistantId: id,
          photoType,
          storageKey,
          url: publicUrl,
          mimeType: file.mimetype,
          size: file.size,
          uploadedBy: dto.uploadedBy,
          imageAuditStatus: ImageAuditStatus.Pending
        }
      });
      if (photoType === AssistantPhotoType.Profile) {
        await tx.assistantPublicProfile.updateMany({
          where: { assistantId: id },
          data: {
            avatarUrl: photo.url,
            imageAuditStatus: ImageAuditStatus.Pending,
            profileStatus: 'pending'
          }
        });
      }
      await this.audit(tx, 'assistant.photo.upload', 'assistant_photo', photo.id, undefined, photo, {
        assistantId: id,
        photoType
      });
      return photo;
    });
  }

  async updatePhotoAudit(id: string, photoId: string, dto: UpdateAssistantPhotoAuditDto) {
    await this.ensureAssistant(id);
    const before = await this.db.assistantPhoto.findFirst({ where: { id: photoId, assistantId: id } });
    if (!before) throw new BusinessException('ASSISTANT_PHOTO_NOT_FOUND', '照片不存在');

    return this.db.$transaction(async tx => {
      const photo = await tx.assistantPhoto.update({
        where: { id: photoId },
        data: {
          imageAuditStatus: dto.imageAuditStatus,
          auditRemark: dto.auditRemark
        }
      });
      if (photo.photoType === AssistantPhotoType.Profile) {
        await tx.assistantPublicProfile.updateMany({
          where: { assistantId: id },
          data: {
            avatarUrl: dto.imageAuditStatus === ImageAuditStatus.Approved ? photo.url : undefined,
            imageAuditStatus: dto.imageAuditStatus
          }
        });
      }
      await this.audit(tx, `assistant.photo.${dto.imageAuditStatus}`, 'assistant_photo', photo.id, before, photo, {
        assistantId: id
      });
      return photo;
    });
  }

  private async ensureAssistant(id: string) {
    const assistant = await this.db.assistant.findUnique({ where: { id } });
    if (!assistant) throw new BusinessException('ASSISTANT_NOT_FOUND', '商务助理不存在');
    return assistant;
  }

  private async persistPhoto(storageKey: string, file: any) {
    if (!file.buffer) return;
    const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
    const target = join(uploadDir, storageKey);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.buffer);
  }

  private audit(
    db: PrismaLike,
    action: string,
    resourceType: string,
    resourceId?: string,
    beforeData?: unknown,
    afterData?: unknown,
    metadata?: Record<string, unknown>
  ) {
    return db.auditLog.create({
      data: {
        actorType: 'admin',
        action,
        resourceType,
        resourceId,
        beforeData,
        afterData,
        metadata: metadata || {}
      }
    });
  }
}
