import { z } from 'zod';

export const commentSchema = z.string().trim().min(0).max(100, 'Comment must be 100 characters or less');
export const urlSchema = z.string().refine(
  (val) => {
    // Accepts URLs with or without scheme (http/https), e.g., www.google.com, https://google.com
    // Basic regex: must have at least one dot and a valid domain part
    // Optionally starts with http(s)://
    return /^((https?:\/\/)?[\w.-]+\.[a-zA-Z]{2,})(:[0-9]+)?(\/.*)?$/.test(val.trim());
  },
  {
    message: 'Must be a valid URL'
  }
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
