import { existsSync } from 'node:fs'
import type { Request, Response } from 'express'
import type { DocumentParams } from '../schemas/document.schema.js'
import { documentService } from '../services/document.service.js'

// POST /api/documents/upload — multipart single file `file`.
export const uploadDocument = async (request: Request, response: Response) => {
  const file = request.file
  if (!file) {
    response.status(400).json({ error: { message: 'No file uploaded (field "file")' } })
    return
  }

  if (file.mimetype !== 'application/pdf') {
    response.status(415).json({ error: { message: 'Only PDF documents are supported' } })
    return
  }

  const conversationId =
    typeof request.body?.conversationId === 'string' && request.body.conversationId.trim().length > 0
      ? request.body.conversationId.trim()
      : 'default'

  const { record, parsed } = await documentService.create(
    conversationId,
    file.originalname,
    file.buffer,
  )

  // No text layer → almost certainly a scan. We can't explain or fill it without
  // OCR, so reject with a clear, actionable message instead of failing later.
  if (parsed.text.length === 0) {
    response.status(422).json({
      error: {
        message:
          'This PDF has no readable text layer (it looks scanned). Please upload a text-based PDF form.',
      },
    })
    return
  }

  response.status(201).json({
    documentId: record.id,
    filename: record.filename,
    pageCount: record.pageCount,
    hasFormFields: parsed.hasFormFields,
    fields: parsed.fields,
    summary: parsed.text.slice(0, 280),
  })
}

// GET /api/documents/:id/download — the filled PDF, once a fill session produced one.
export const downloadDocument = (
  request: Request<DocumentParams>,
  response: Response,
) => {
  const record = documentService.getById(request.params.id)
  if (!record) {
    response.status(404).json({ error: { message: 'Document not found' } })
    return
  }

  const filledPath = documentService.filledPath(record.id)
  if (!existsSync(filledPath)) {
    response.status(404).json({ error: { message: 'No filled document available yet' } })
    return
  }

  const downloadName = record.filename.replace(/\.pdf$/i, '') + '-wypelniony.pdf'
  response.download(filledPath, downloadName)
}
