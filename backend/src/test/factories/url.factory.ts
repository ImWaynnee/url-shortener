/* istanbul ignore file */

import { createSequence } from '@factories/factory.utils';
import { faker } from '@faker-js/faker/locale/en';
import type { Prisma } from '@src/generated/prisma/client';
import type { UrlDestinationModel, UrlModel } from '@src/generated/prisma/models';
import type { PrismaService } from '@src/prisma.service';

/** Url row with an eagerly-loaded urlDestinations relation (mirrors the
 *  `include: { urlDestinations: ... }` query in getLinkedUrl). */
export type UrlWithDestinations = UrlModel & { urlDestinations: UrlDestinationModel[] };

export const nextId = createSequence();

/** Returns a plain object — use in unit tests with mocked Prisma. */
export const buildUrl = (overrides: Partial<UrlModel> = {}): UrlModel =>{
  return {
    id: nextId(),
    shortUrl: faker.string.alphanumeric(7),
    createdById: faker.string.uuid(),
    comments: null,
    isActive: true,
    expiresAt: null,
    createdAt: faker.date.past(),
    updatedAt: null,
    ...overrides
  };
};

/** Calls prisma.url.create — use in integration tests with a real DB. */
export const createUrl = async (
  prisma: PrismaService,
  overrides: Partial<Prisma.UrlUncheckedCreateInput> = {}
): Promise<UrlModel> => {
  return prisma.url.create({
    data: {
      shortUrl: faker.string.alphanumeric(7),
      ...overrides
    }
  });
};

export const buildUrlWithDestinations = (
  urlOverrides: Partial<UrlModel> = {},
  destinations: UrlDestinationModel[] = []
): UrlWithDestinations => {
  return {
    ...buildUrl(urlOverrides),
    urlDestinations: destinations
  };
};
