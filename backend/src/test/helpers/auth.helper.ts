import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '@src/prisma.service';

export async function createTestUser(
  prisma: PrismaService,
  overrides: { email?: string;
    fullName?: string } = {}
) {
  const suffix = `${Date.now()}-${Math.random().toString(36)
    .slice(2, 8)}`;
  return prisma.user.create({
    data: {
      email: overrides.email ?? `test-${suffix}@example.com`,
      fullName: overrides.fullName ?? 'Test User',
      lastLoginAt: new Date(),
      lastLoginProvider: 'local'
    }
  });
}

export function issueAccessToken(
  jwtService: JwtService,
  user: { id: string;
    email: string;
    fullName?: string | null }
): string {
  return jwtService.sign({
    sub: user.id,
    email: user.email,
    ...(user.fullName ? { fullName: user.fullName } : {})
  });
}
