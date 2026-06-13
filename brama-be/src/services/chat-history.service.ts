import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import Database from 'better-sqlite3'
import type { ChatMessage, ChatRole } from '../schemas/chat.schema.js'

const maxMessages = 20

type StoredChatMessage = {
  role: ChatRole
  content: string
}

export class ChatHistoryService {
  private readonly database: Database.Database
  private readonly insertMessage: Database.Statement<[string, ChatRole, string]>
  private readonly selectMessages: Database.Statement<[string, number], StoredChatMessage>
  private readonly deleteMessages: Database.Statement<[string]>

  constructor(databasePath: string) {
    const resolvedPath = resolve(databasePath)

    mkdirSync(dirname(resolvedPath), { recursive: true })

    this.database = new Database(resolvedPath)
    this.database.pragma('journal_mode = WAL')
    this.database.exec(
      [
        'CREATE TABLE IF NOT EXISTS messages (',
        'id INTEGER PRIMARY KEY AUTOINCREMENT,',
        'cid TEXT NOT NULL,',
        'role TEXT NOT NULL,',
        'content TEXT NOT NULL',
        ')',
      ].join(' '),
    )

    this.insertMessage = this.database.prepare(
      'INSERT INTO messages (cid, role, content) VALUES (?, ?, ?)',
    )
    this.selectMessages = this.database.prepare(
      'SELECT role, content FROM messages WHERE cid = ? ORDER BY id DESC LIMIT ?',
    )
    this.deleteMessages = this.database.prepare('DELETE FROM messages WHERE cid = ?')
  }

  getHistory(conversationId: string): ChatMessage[] {
    return this.selectMessages.all(conversationId, maxMessages).reverse()
  }

  addMessage(conversationId: string, role: ChatRole, content: string) {
    this.insertMessage.run(conversationId, role, content)
  }

  clearHistory(conversationId: string) {
    this.deleteMessages.run(conversationId)
  }
}
