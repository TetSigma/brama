import { z } from 'zod'

// Multipart upload: multer parses the file; the optional conversationId arrives
// as a text field so the document is scoped to the right chat thread.
export const uploadDocumentBodySchema = z.object({
  conversationId: z.string().trim().min(1).default('default'),
})

export const documentParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export type UploadDocumentBody = z.infer<typeof uploadDocumentBodySchema>
export type DocumentParams = z.infer<typeof documentParamsSchema>
