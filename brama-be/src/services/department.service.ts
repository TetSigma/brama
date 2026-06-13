import Database from 'better-sqlite3'
import { env } from '../config/env.js'

export type Department = {
  nazwa: string
  symbol: string | null
  adres: string | null
  telefon: string | null
  email: string | null
  godziny_pracy: string | null
  lat: number | null
  lng: number | null
}

type DepartmentRow = Omit<Department, 'lat' | 'lng'> & { lat?: number | null; lng?: number | null }

export class DepartmentService {
  private readonly selectBySymbol: Database.Statement<[string], DepartmentRow> | null

  constructor() {
    try {
      const database = new Database(env.DEPARTMENTS_DATABASE_PATH, {
        readonly: true,
        fileMustExist: true,
      })
      // lat/lng are populated by the separate `npm run geocode` script and may
      // not exist yet on an older DB — only SELECT them when the columns are
      // present, so office lookups keep working before geocoding has run.
      const columns = database.prepare('PRAGMA table_info(departments)').all() as {
        name: string
      }[]
      const hasCoords =
        columns.some((column) => column.name === 'lat') &&
        columns.some((column) => column.name === 'lng')
      const coordSelect = hasCoords ? ', lat, lng' : ''
      this.selectBySymbol = database.prepare(
        `SELECT nazwa, symbol, adres, telefon, email, godziny_pracy${coordSelect} ` +
          'FROM departments WHERE symbol = ? LIMIT 1',
      )
    } catch (error) {
      // The departments DB is produced by `npm run ingest`; tolerate its absence.
      console.error('Departments DB unavailable; office contact disabled', error)
      this.selectBySymbol = null
    }
  }

  getBySymbol(symbol: string): Department | null {
    if (!this.selectBySymbol || symbol.length === 0) {
      return null
    }

    try {
      const row = this.selectBySymbol.get(symbol)
      if (!row) {
        return null
      }
      return { ...row, lat: row.lat ?? null, lng: row.lng ?? null }
    } catch (error) {
      console.error('Department lookup failed', error)
      return null
    }
  }
}
