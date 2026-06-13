import Database from 'better-sqlite3'
import { env } from '../config/env.js'

export type Department = {
  nazwa: string
  symbol: string | null
  adres: string | null
  telefon: string | null
  email: string | null
  godziny_pracy: string | null
}

export class DepartmentService {
  private readonly database: Database.Database | null
  private readonly selectBySymbol: Database.Statement<[string], Department> | null

  constructor() {
    try {
      const database = new Database(env.DEPARTMENTS_DATABASE_PATH, {
        readonly: true,
        fileMustExist: true,
      })
      this.database = database
      this.selectBySymbol = database.prepare(
        'SELECT nazwa, symbol, adres, telefon, email, godziny_pracy ' +
          'FROM departments WHERE symbol = ? LIMIT 1',
      )
    } catch (error) {
      // The departments DB is produced by `npm run ingest`; tolerate its absence.
      console.error('Departments DB unavailable; office contact disabled', error)
      this.database = null
      this.selectBySymbol = null
    }
  }

  getBySymbol(symbol: string): Department | null {
    if (!this.selectBySymbol || symbol.length === 0) {
      return null
    }

    try {
      return this.selectBySymbol.get(symbol) ?? null
    } catch (error) {
      console.error('Department lookup failed', error)
      return null
    }
  }
}
