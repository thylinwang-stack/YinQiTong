import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { BusinessException } from '@/common/errors/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminLoginDto, WechatLoginDto } from './dto/auth.dto';

type PrismaLike = PrismaService & { [key: string]: any };

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly db: PrismaLike) {}

  async adminLogin(dto: AdminLoginDto) {
    const configuredUsername = process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin';
    const configuredPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'admin123456';
    let user = await this.db.user.findFirst({
      where: { username: dto.username, userType: 'admin' },
      include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }
    });

    if (!user && dto.username === configuredUsername && dto.password === configuredPassword) {
      user = await this.db.user.create({
        data: {
          username: configuredUsername,
          nickname: '系统管理员',
          userType: 'admin',
          passwordHash: this.hashPassword(configuredPassword),
          status: 'active'
        },
        include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }
      });
    }

    if (!user || user.status !== 'active') {
      throw new BusinessException('AUTH_INVALID_CREDENTIALS', '账号或密码不正确');
    }
    if (user.passwordHash && !this.verifyPassword(dto.password, user.passwordHash)) {
      throw new BusinessException('AUTH_INVALID_CREDENTIALS', '账号或密码不正确');
    }
    if (!user.passwordHash && (dto.username !== configuredUsername || dto.password !== configuredPassword)) {
      throw new BusinessException('AUTH_INVALID_CREDENTIALS', '账号或密码不正确');
    }

    const token = await this.createSession(user.id);
    await this.audit('auth.admin_login', 'user', user.id, { username: dto.username });
    return { token, user: this.toUserProfile(user, dto.username === configuredUsername ? ['*'] : undefined) };
  }

  async wechatLogin(dto: WechatLoginDto) {
    const session = await this.code2Session(dto.code);
    const user = await this.db.user.upsert({
      where: { openid: session.openid },
      create: {
        openid: session.openid,
        unionId: session.unionid,
        nickname: dto.nickname,
        avatarUrl: dto.avatarUrl,
        userType: 'customer',
        status: 'active',
        customer: { create: { name: dto.nickname } }
      },
      update: {
        unionId: session.unionid,
        nickname: dto.nickname,
        avatarUrl: dto.avatarUrl
      },
      include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }
    });
    const token = await this.createSession(user.id);
    await this.audit('auth.wechat_login', 'user', user.id, { openid: session.openid });
    return { token, openid: session.openid, user: this.toUserProfile(user) };
  }

  async me(authorization?: string) {
    const user = await this.getUserFromAuthorization(authorization);
    return this.toUserProfile(user);
  }

  async getUserFromAuthorization(authorization?: string) {
    const token = this.extractBearerToken(authorization);
    if (!token) throw new BusinessException('AUTH_REQUIRED', '请先登录', HttpStatus.UNAUTHORIZED);
    const tokenHash = this.hashToken(token);
    const session = await this.db.authSession.findUnique({
      where: { tokenHash },
      include: { user: { include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } } }
    });
    if (!session || session.expiresAt < new Date() || session.user.status !== 'active') {
      throw new BusinessException('AUTH_EXPIRED', '登录态已过期，请重新登录', HttpStatus.UNAUTHORIZED);
    }
    return session.user;
  }

  toUserProfile(user: any, overridePermissions?: string[]) {
    const roleCodes = (user.userRoles || []).map((item: any) => item.role.code);
    const bootstrapAdmin = user.userType === 'admin'
      && user.username === (process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin')
      && roleCodes.length === 0;
    const permissions = overridePermissions || (bootstrapAdmin ? ['*'] : Array.from(new Set(
      (user.userRoles || []).flatMap((item: any) => (item.role.permissions || []).map((rp: any) => rp.permission.code))
    )));
    return {
      id: user.id,
      name: user.nickname || user.username || '用户',
      userType: user.userType,
      roleCodes,
      permissions,
      cityScope: ['*']
    };
  }

  private async createSession(userId: string) {
    const token = randomBytes(32).toString('base64url');
    await this.db.authSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
      }
    });
    return token;
  }

  private async code2Session(code: string): Promise<{ openid: string; unionid?: string }> {
    if (process.env.WECHAT_LOGIN_MOCK === 'true') {
      return { openid: process.env.WECHAT_LOGIN_MOCK_OPENID || 'mock_openid_customer' };
    }
    const appid = process.env.WECHAT_MP_APPID;
    const secret = process.env.WECHAT_MP_SECRET;
    if (!appid || !secret) {
      throw new BusinessException('WECHAT_CONFIG_MISSING', '缺少微信小程序登录配置');
    }
    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appid);
    url.searchParams.set('secret', secret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');
    const response = await fetch(url);
    const payload = await response.json() as { openid?: string; unionid?: string; errcode?: number; errmsg?: string };
    if (!payload.openid) {
      throw new BusinessException('WECHAT_CODE2SESSION_FAILED', payload.errmsg || '微信登录失败', 400, { errcode: payload.errcode });
    }
    return { openid: payload.openid, unionid: payload.unionid };
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const digest = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
    return `pbkdf2_sha256$120000$${salt}$${digest}`;
  }

  private verifyPassword(password: string, passwordHash: string) {
    const [algo, iterations, salt, expected] = passwordHash.split('$');
    if (algo !== 'pbkdf2_sha256' || !iterations || !salt || !expected) return false;
    const digest = pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return expectedBuffer.length === digest.length && timingSafeEqual(expectedBuffer, digest);
  }

  private extractBearerToken(authorization?: string) {
    const value = authorization || '';
    return value.startsWith('Bearer ') ? value.slice(7) : '';
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private audit(action: string, resourceType: string, resourceId?: string, metadata: Record<string, unknown> = {}) {
    return this.db.auditLog.create({
      data: { actorType: 'system', action, resourceType, resourceId, metadata: metadata as any }
    });
  }
}
