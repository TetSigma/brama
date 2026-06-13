const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export type UploadedDocumentField = {
  name: string
  type: string
  options?: string[]
  required: boolean
}

// Mirrors the POST /api/documents/upload response.
export type UploadDocumentResponse = {
  documentId: string
  filename: string
  pageCount: number
  hasFormFields: boolean
  fields: UploadedDocumentField[]
  summary: string
}

/** Uploads a PDF to POST /api/documents/upload and returns its parsed metadata. */
export async function uploadDocument(
  file: File,
  conversationId: string,
): Promise<UploadDocumentResponse> {
  const body = new FormData()
  body.append('file', file)
  body.append('conversationId', conversationId)

  const response = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body,
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.error?.message ?? `Upload failed: ${response.status}`)
  }

  return (await response.json()) as UploadDocumentResponse
}
