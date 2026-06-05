import { z } from 'zod';

export const commentSchema = z.string().trim()
  .min(0)
  .max(100, 'Comment must be 100 characters or less');
function isHttpUrl(val: string): boolean {
  try {
    const url = new URL(val);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const urlSchema = z.string().refine(
  (val) => {
    const trimmed = val.trim();
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return isHttpUrl(withScheme);
  },
  { message: 'Must be a valid URL' }
);

export const expirySchema = z.union([
  z.iso.datetime({ offset: true }),
  z.null()
]);

export const updateUrlPayloadSchema = z.object({
  comments: commentSchema.optional(),
  destinationUrl: urlSchema.optional(),
  expiresAt: expirySchema.optional()
});

export type UpdateUrlPayload = z.infer<typeof updateUrlPayloadSchema>;
