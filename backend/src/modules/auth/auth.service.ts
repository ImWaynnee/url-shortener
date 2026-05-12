import { createHash, randomUUID } from 'node:crypto';

import { AuthTokenResponse } from '@modules/auth/dto/auth-token.response.dto';
import { RegisterRequestBody } from '@modules/auth/dto/register.request.dto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientInfo } from '@src/common/utils/extract-client-info';
import { UserModel } from '@src/generated/prisma/models/User';
import { PrismaService } from '@src/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateLocalUser(email: string, password: string): Promise<UserModel | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const provider = await this.prisma.userAuthProvider.findFirst({
      where: {
        userId: user.id,
        provider: 'local' 
      },
    });
    if (!provider?.secret) return null;

    const isValid = await bcrypt.compare(password, provider.secret);
    return isValid ? user : null;
  }

  async register(registrationData: RegisterRequestBody, clientInfo: ClientInfo): Promise<AuthTokenResponse> {
    const { email, fullName, password } = registrationData;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Account already exists, try logging in.');

    const hash = await bcrypt.hash(password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          email,
          fullName,
          lastLoginAt: new Date(),
          lastLoginProvider: 'local',
          authProviders: {
            create: {
              provider: 'local',
              secret: hash 
            },
          },
        },
      });
    });

    return this.generateTokenPair(created, clientInfo);
  }

  async login(user: UserModel, clientInfo: ClientInfo): Promise<AuthTokenResponse> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userAuthProvider.findFirstOrThrow({
        where: {
          userId: user.id,
          provider: 'local' 
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginProvider: 'local' 
        },
      });
    });

    return this.generateTokenPair(user, clientInfo);
  }

  async findOrCreateGoogleUser(profile: {
    email?: string;
    fullName?: string;
    providerUserId: string;
  }): Promise<UserModel> {
    return this.prisma.$transaction(async (tx) => {
      const existingProvider = await tx.userAuthProvider.findFirst({
        where: {
          provider: 'google',
          providerUserId: profile.providerUserId 
        },
        include: { user: true },
      });

      let user: UserModel;

      if (existingProvider) {
        user = existingProvider.user;
      } else {
        const existingUser = profile.email
          ? await tx.user.findUnique({ where: { email: profile.email } })
          : null;

        if (existingUser) {
          user = existingUser;
        } else {
          user = await tx.user.create({
            data: {
              email: profile.email!,
              fullName: profile.fullName,
            },
          });
        }

        await tx.userAuthProvider.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerUserId: profile.providerUserId,
          },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginProvider: 'google' 
        },
      });

      return user;
    });
  }

  async loginWithGoogle(user: UserModel, clientInfo: ClientInfo): Promise<AuthTokenResponse> {
    return this.generateTokenPair(user, clientInfo);
  }

  async refreshTokens(token: string, clientInfo: ClientInfo): Promise<AuthTokenResponse> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const row = await this.prisma.userRefreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!row) {
      throw new UnauthorizedException('Invalid session');
    }

    // Check for usage of revoked token.
    const REUSE_GRACE_PERIOD_MS = 10000;
    const revokedOutsideGrace =
      row.isRevoked &&
      row.revokedAt &&
      Date.now() - row.revokedAt.getTime() > REUSE_GRACE_PERIOD_MS;

    if (revokedOutsideGrace) {
      // Token was used again well after revocation,
      // Revoke ALL sessions for this user as a precaution.
      await this.prisma.userRefreshToken.updateMany({
        where: {
          userId: row.userId,
          isRevoked: false 
        },
        data: {
          isRevoked: true,
          revokedAt: new Date() 
        },
      });
      throw new UnauthorizedException('Token already used');
    }

    if (row.isRevoked) {
      throw new UnauthorizedException('Invalid session');
    }

    if (row.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // Rotate: revoke old token and issue a new pair atomically.
    const newRefreshToken = randomUUID();
    const newHash = createHash('sha256').update(newRefreshToken).digest('hex');

    await this.prisma.$transaction(async (tx) => {
      await tx.userRefreshToken.update({
        where: { id: row.id },
        data: {
          isRevoked: true,
          revokedAt: new Date() 
        },
      });
      await tx.userRefreshToken.create({
        data: {
          userId: row.userId,
          tokenHash: newHash,
          expiresAt: this.refreshTokenExpiresAt,
          deviceInfo: clientInfo.deviceInfo,
          ipAddress: clientInfo.ipAddress,
        },
      });
    });

    return {
      accessToken: this.jwtService.sign({
        sub: row.user.id,
        email: row.user.email,
        ...(row.user.fullName ? { fullName: row.user.fullName } : {}),
      }),
      refreshToken: newRefreshToken,
    };
  }

  private get refreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.configService.get<number>('JWT_REFRESH_EXPIRATION', 7 * 24 * 3600) * 1000);
  }

  private async generateTokenPair(
    user: { id: string;
      email: string;
      fullName?: string | null },
    clientInfo: ClientInfo,
  ): Promise<AuthTokenResponse> {
    const refreshToken = randomUUID();
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.userRefreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: this.refreshTokenExpiresAt,
        deviceInfo: clientInfo.deviceInfo,
        ipAddress: clientInfo.ipAddress,
      },
    });

    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        ...(user.fullName ? { fullName: user.fullName } : {}),
      }),
      refreshToken: refreshToken,
    };
  }
}
