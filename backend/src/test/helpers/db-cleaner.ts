import type { PrismaService } from '@src/prisma.service';

// Tables ordered leaf-to-root; CASCADE handles any remaining FK dependencies.
const TRUNCATE_SQL = `
  TRUNCATE TABLE
    url_clicks,
    url_stats,
    url_destinations,
    urls,
    user_auth_providers,
    user_refresh_tokens,
    users
  RESTART IDENTITY CASCADE
`;

export async function truncateAll(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(TRUNCATE_SQL);
}
