import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import fontkit from '@pdf-lib/fontkit'
import { env } from '../config/env.js'
import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  type PDFField,
} from 'pdf-lib'
import { PDFParse } from 'pdf-parse'

// A Unicode TTF (full Polish coverage) embedded into filled PDFs so values like
// "Wałęsa" render — pdf-lib's built-in fonts are WinAnsi and can't encode them.
// Resolved relative to this module so it works under tsx (src) and the build (dist).
export const FORM_FONT_PATH = fileURLToPath(
  new URL('../../assets/fonts/DejaVuSans.ttf', import.meta.url),
)

export type DocumentFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'optionList'

// One fillable AcroForm field, normalised across pdf-lib's field classes so the
// chat fill state machine can question + coerce by `type` without touching pdf-lib.
export type DocumentField = {
  name: string
  type: DocumentFieldType
  options?: string[]
  required: boolean
}

export type ParsedPdf = {
  text: string
  pageCount: number
  fields: DocumentField[]
  hasFormFields: boolean
}

export type DocumentRecord = {
  id: string
  conversationId: string
  filename: string
  pageCount: number
  text: string
  fields: DocumentField[]
  createdAt: number
}

export type FillSessionStatus = 'active' | 'done' | 'cancelled'

export type FillSession = {
  id: number
  conversationId: string
  documentId: string
  currentIndex: number
  status: FillSessionStatus
  answers: Record<string, string>
}

type DocumentRow = {
  id: string
  conversation_id: string
  filename: string
  page_count: number
  text: string
  fields_json: string
  created_at: number
}

type FillSessionRow = {
  id: number
  conversation_id: string
  document_id: string
  current_index: number
  status: FillSessionStatus
  answers_json: string
}

// Persists uploaded PDFs (bytes on disk, metadata in SQLite), parses their text
// layer + AcroForm fields, drives the per-conversation fill session, and fills
// the AcroForm deterministically (no LLM in the value path — see D14).
export class DocumentService {
  private readonly database: Database.Database
  private readonly documentsDir: string
  private fontBytes: Buffer | null = null

  private readonly insertDocument: Database.Statement<
    [string, string, string, number, string, string, number]
  >
  private readonly selectDocument: Database.Statement<[string], DocumentRow>
  private readonly selectActiveSession: Database.Statement<[string], FillSessionRow>
  private readonly insertSession: Database.Statement<[string, string]>
  private readonly updateSession: Database.Statement<[number, string, number]>
  private readonly closeSessionsForConversation: Database.Statement<[string]>
  private readonly setSessionStatus: Database.Statement<[FillSessionStatus, number]>

  constructor(databasePath: string, documentsDir: string) {
    const resolvedDbPath = resolve(databasePath)
    mkdirSync(dirname(resolvedDbPath), { recursive: true })

    this.documentsDir = resolve(documentsDir)
    mkdirSync(this.documentsDir, { recursive: true })

    this.database = new Database(resolvedDbPath)
    this.database.pragma('journal_mode = WAL')
    this.database.exec(
      [
        'CREATE TABLE IF NOT EXISTS documents (',
        'id TEXT PRIMARY KEY,',
        'conversation_id TEXT NOT NULL,',
        'filename TEXT NOT NULL,',
        'page_count INTEGER NOT NULL,',
        'text TEXT NOT NULL,',
        'fields_json TEXT NOT NULL,',
        'created_at INTEGER NOT NULL',
        ')',
      ].join(' '),
    )
    this.database.exec(
      [
        'CREATE TABLE IF NOT EXISTS fill_sessions (',
        'id INTEGER PRIMARY KEY AUTOINCREMENT,',
        'conversation_id TEXT NOT NULL,',
        'document_id TEXT NOT NULL,',
        'current_index INTEGER NOT NULL DEFAULT 0,',
        "status TEXT NOT NULL DEFAULT 'active',",
        "answers_json TEXT NOT NULL DEFAULT '{}'",
        ')',
      ].join(' '),
    )

    this.insertDocument = this.database.prepare(
      'INSERT INTO documents (id, conversation_id, filename, page_count, text, fields_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    this.selectDocument = this.database.prepare('SELECT * FROM documents WHERE id = ?')
    this.selectActiveSession = this.database.prepare(
      "SELECT * FROM fill_sessions WHERE conversation_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
    )
    this.insertSession = this.database.prepare(
      'INSERT INTO fill_sessions (conversation_id, document_id) VALUES (?, ?)',
    )
    this.updateSession = this.database.prepare(
      'UPDATE fill_sessions SET current_index = ?, answers_json = ? WHERE id = ?',
    )
    this.closeSessionsForConversation = this.database.prepare(
      "UPDATE fill_sessions SET status = 'cancelled' WHERE conversation_id = ? AND status = 'active'",
    )
    this.setSessionStatus = this.database.prepare(
      'UPDATE fill_sessions SET status = ? WHERE id = ?',
    )
  }

  // --- Parsing -------------------------------------------------------------

  async parsePdf(buffer: Buffer): Promise<ParsedPdf> {
    const { text, pageCount } = await this.extractText(buffer)
    const fields = await this.extractFields(buffer)
    return { text: text.trim(), pageCount, fields, hasFormFields: fields.length > 0 }
  }

  private async extractText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    // pdf-parse may transfer ownership of the typed array to its worker, so give
    // it a private copy and keep `buffer` intact for pdf-lib.
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    try {
      const result = await parser.getText()
      const pageCount = result.total || result.pages?.length || 0
      return { text: result.text ?? '', pageCount }
    } finally {
      await parser.destroy()
    }
  }

  private async extractFields(buffer: Buffer): Promise<DocumentField[]> {
    try {
      const pdf = await PDFDocument.load(new Uint8Array(buffer), { ignoreEncryption: true })
      const form = pdf.getForm()
      return form
        .getFields()
        .map((field) => this.describeField(field))
        .filter((field): field is DocumentField => field !== null)
    } catch {
      // No AcroForm, or a structure pdf-lib can't read → treat as a flat PDF.
      return []
    }
  }

  private describeField(field: PDFField): DocumentField | null {
    const name = field.getName()
    const required = field.isRequired()

    if (field instanceof PDFTextField) {
      return { name, type: 'text', required }
    }
    if (field instanceof PDFCheckBox) {
      return { name, type: 'checkbox', required }
    }
    if (field instanceof PDFRadioGroup) {
      return { name, type: 'radio', options: field.getOptions(), required }
    }
    if (field instanceof PDFDropdown) {
      return { name, type: 'dropdown', options: field.getOptions(), required }
    }
    if (field instanceof PDFOptionList) {
      return { name, type: 'optionList', options: field.getOptions(), required }
    }
    // Buttons, signatures and anything else are not user-fillable text values.
    return null
  }

  // --- Persistence ---------------------------------------------------------

  async create(conversationId: string, filename: string, buffer: Buffer): Promise<{
    record: DocumentRecord
    parsed: ParsedPdf
  }> {
    const parsed = await this.parsePdf(buffer)
    const id = randomUUID()

    mkdirSync(this.documentDir(id), { recursive: true })
    await writeFile(this.originalPath(id), buffer)

    const createdAt = Date.now()
    this.insertDocument.run(
      id,
      conversationId,
      filename,
      parsed.pageCount,
      parsed.text,
      JSON.stringify(parsed.fields),
      createdAt,
    )

    return {
      record: {
        id,
        conversationId,
        filename,
        pageCount: parsed.pageCount,
        text: parsed.text,
        fields: parsed.fields,
        createdAt,
      },
      parsed,
    }
  }

  getById(documentId: string): DocumentRecord | null {
    const row = this.selectDocument.get(documentId)
    return row ? this.toRecord(row) : null
  }

  private toRecord(row: DocumentRow): DocumentRecord {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      filename: row.filename,
      pageCount: row.page_count,
      text: row.text,
      fields: JSON.parse(row.fields_json) as DocumentField[],
      createdAt: row.created_at,
    }
  }

  // --- Fill sessions -------------------------------------------------------

  getActiveSession(conversationId: string): FillSession | null {
    const row = this.selectActiveSession.get(conversationId)
    return row ? this.toSession(row) : null
  }

  startSession(conversationId: string, documentId: string): FillSession {
    // Only one active session per conversation: retire any in-flight one first.
    this.closeSessionsForConversation.run(conversationId)
    const info = this.insertSession.run(conversationId, documentId)
    return {
      id: Number(info.lastInsertRowid),
      conversationId,
      documentId,
      currentIndex: 0,
      status: 'active',
      answers: {},
    }
  }

  saveSessionProgress(session: FillSession): void {
    this.updateSession.run(session.currentIndex, JSON.stringify(session.answers), session.id)
  }

  closeSession(sessionId: number, status: FillSessionStatus): void {
    this.setSessionStatus.run(status, sessionId)
  }

  private toSession(row: FillSessionRow): FillSession {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      documentId: row.document_id,
      currentIndex: row.current_index,
      status: row.status,
      answers: JSON.parse(row.answers_json) as Record<string, string>,
    }
  }

  // --- Filling -------------------------------------------------------------

  // Fills the original AcroForm with the collected answers and writes filled.pdf.
  // Field types come from the stored metadata; the LLM never supplies values.
  async fillPdf(documentId: string, answers: Record<string, string>): Promise<string> {
    const record = this.getById(documentId)
    if (!record) {
      throw new Error(`Unknown document: ${documentId}`)
    }

    const originalBytes = await readFile(this.originalPath(documentId))
    const pdf = await PDFDocument.load(new Uint8Array(originalBytes), { ignoreEncryption: true })
    pdf.registerFontkit(fontkit)
    const font = await pdf.embedFont(await this.loadFont(), { subset: true })
    const form = pdf.getForm()
    const fieldTypes = new Map(record.fields.map((field) => [field.name, field.type]))

    for (const [name, value] of Object.entries(answers)) {
      try {
        this.applyAnswer(form, name, fieldTypes.get(name), value)
      } catch {
        // A single mismatched field shouldn't abort the whole fill.
      }
    }

    // Re-render every field with the Unicode font so Polish diacritics survive,
    // then flatten so the result prints cleanly and isn't accidentally editable.
    form.updateFieldAppearances(font)
    form.flatten()
    const filledBytes = await pdf.save()
    const filledPath = this.filledPath(documentId)
    await writeFile(filledPath, filledBytes)
    return filledPath
  }

  private applyAnswer(
    form: ReturnType<PDFDocument['getForm']>,
    name: string,
    type: DocumentFieldType | undefined,
    value: string,
  ): void {
    switch (type) {
      case 'checkbox': {
        const checkbox = form.getCheckBox(name)
        if (this.isTruthy(value)) checkbox.check()
        else checkbox.uncheck()
        return
      }
      case 'radio':
        form.getRadioGroup(name).select(value)
        return
      case 'dropdown':
        form.getDropdown(name).select(value)
        return
      case 'optionList':
        form.getOptionList(name).select(value)
        return
      case 'text':
      default:
        form.getTextField(name).setText(value)
    }
  }

  private async loadFont(): Promise<Buffer> {
    if (!this.fontBytes) {
      this.fontBytes = await readFile(FORM_FONT_PATH)
    }
    return this.fontBytes
  }

  private isTruthy(value: string): boolean {
    const normalized = value.trim().toLowerCase()
    return ['tak', 'yes', 'true', '1', 'x', 'da', 'так'].includes(normalized)
  }

  filledPath(documentId: string): string {
    return join(this.documentDir(documentId), 'filled.pdf')
  }

  private originalPath(documentId: string): string {
    return join(this.documentDir(documentId), 'original.pdf')
  }

  private documentDir(documentId: string): string {
    return join(this.documentsDir, documentId)
  }
}

export const documentService = new DocumentService(
  env.DOCUMENTS_DATABASE_PATH,
  env.DOCUMENTS_DIR,
)
