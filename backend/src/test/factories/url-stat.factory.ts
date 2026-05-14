/* istanbul ignore file */

import { createSequence } from '@factories/factory.utils';
import { faker } from '@faker-js/faker';
import type { Prisma } from '@src/generated/prisma/client';
import type { UrlStatModel } from '@src/generated/prisma/models';
import type { PrismaService } from '@src/prisma.service';

const nextId = createSequence();
const nextUrlId = createSequence();

/**
 * Returns a plain object — use in unit tests with mocked Prisma.
 * Always pass `urlId` explicitly when the relationship must match a specific Url.
 */
export function buildUrlStat(overrides: Partial<UrlStatModel> = {}): UrlStatModel {
  return {
    id: nextId(),
    urlId: nextUrlId(),
    totalClicks: 0,
    clicksSyncedAt: faker.date.past(),
    lastClickedAt: null,
    ...overrides
  };
}

/**
 * Calls prisma.urlStat.create — use in integration tests with a real DB.
 * `urlId` is required; pass the id of an already-created Url row.
 */
export async function createUrlStat(
  prisma: PrismaService,
  urlId: bigint,
  overrides: Omit<Partial<Prisma.UrlStatCreateInput>, 'url'> = {}
): Promise<UrlStatModel> {
  return prisma.urlStat.create({
    data: {
      totalClicks: 0,
      ...overrides,
      url: { connect: { id: urlId } }
    }
  });
}
