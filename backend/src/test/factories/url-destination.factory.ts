/* istanbul ignore file */

import { createSequence } from '@factories/factory.utils';
import { faker } from '@faker-js/faker/locale/en';
import type { Prisma } from '@src/generated/prisma/client';
import type { UrlDestinationModel } from '@src/generated/prisma/models';
import type { PrismaService } from '@src/prisma.service';

const nextId = createSequence();
const nextUrlId = createSequence();

/**
 * Returns a plain object — use in unit tests with mocked Prisma.
 * Always pass `urlId` explicitly when the relationship must match a specific Url.
 */
export function buildUrlDestination(overrides: Partial<UrlDestinationModel> = {}): UrlDestinationModel {
  return {
    id: nextId(),
    urlId: nextUrlId(),
    destinationUrl: faker.internet.url(),
    createdAt: faker.date.past(),
    updatedAt: null,
    ...overrides
  };
}

/**
 * Calls prisma.urlDestination.create — use in integration tests with a real DB.
 * `urlId` is required; pass the id of an already-created Url row.
 */
export async function createUrlDestination(
  prisma: PrismaService,
  urlId: bigint,
  overrides: Omit<Partial<Prisma.UrlDestinationCreateInput>, 'url'> = {}
): Promise<UrlDestinationModel> {
  return prisma.urlDestination.create({
    data: {
      destinationUrl: faker.internet.url(),
      ...overrides,
      url: { connect: { id: urlId } }
    }
  });
}
