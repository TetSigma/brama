import { Router } from 'express'
import multer from 'multer'
import { env } from '../config/env.js'
import { downloadDocument, uploadDocument } from '../controllers/document.controller.js'
import { documentParamsSchema } from '../schemas/document.schema.js'
import { validateRequest } from '../validators/validate-request.js'

// In-memory upload: the buffer is parsed and persisted to disk by DocumentService,
// so we don't need multer's own disk storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    callback(null, file.mimetype === 'application/pdf')
  },
})

export const documentsRouter = Router()

documentsRouter.post('/upload', upload.single('file'), uploadDocument)
documentsRouter.get(
  '/:id/download',
  validateRequest('params', documentParamsSchema),
  downloadDocument,
)
