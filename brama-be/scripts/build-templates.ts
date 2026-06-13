/**
 * Generates the demo AcroForm templates under assets/templates/.
 *
 * The real Lublin forms (e.g. "Upowaznienie do odbioru zaswiadczenia") are flat
 * print-only PDFs with no fillable fields, so per D14 we recreate one as a proper
 * AcroForm we control. Field names are human-readable so the conversational fill
 * flow asks clean questions. Run with: npm run build:templates
 */
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'node:fs/promises'
import { FORM_FONT_PATH } from '../src/services/document.service.js'

const here = dirname(fileURLToPath(import.meta.url))
const templatesDir = join(here, '..', 'assets', 'templates')

type FieldSpec = { name: string; label: string }

// Mirrors the structure of the real MUP Lublin "Upowaznienie do odbioru
// zaswiadczenia" form, recreated as fillable fields.
const fields: FieldSpec[] = [
  { name: 'miejscowosc_i_data', label: 'Miejscowosc i data' },
  { name: 'mocodawca_imie_i_nazwisko', label: 'Imie i nazwisko osoby udzielajacej upowaznienia' },
  { name: 'mocodawca_adres', label: 'Adres osoby udzielajacej upowaznienia' },
  { name: 'mocodawca_pesel', label: 'PESEL osoby udzielajacej upowaznienia' },
  { name: 'upowazniony_imie_i_nazwisko', label: 'Imie i nazwisko osoby upowaznionej' },
  { name: 'upowazniony_pesel', label: 'PESEL osoby upowaznionej' },
  { name: 'rodzaj_zaswiadczenia', label: 'Rodzaj zaswiadczenia do odbioru' },
]

async function buildUpowaznienie() {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(await readFile(FORM_FONT_PATH), { subset: false })

  const page = pdf.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const left = 60
  const right = width - 60
  const form = pdf.getForm()

  let y = height - 70
  const header = [
    'Miejski Urzad Pracy w Lublinie',
    'ul. Niecala 14, 20-080 Lublin',
  ]
  for (const line of header) {
    page.drawText(line, { x: left, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) })
    y -= 16
  }

  y -= 24
  page.drawText('UPOWAZNIENIE DO ODBIORU ZASWIADCZENIA', {
    x: left,
    y,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  })

  y -= 36
  page.drawText('Upowazniam wymieniona ponizej osobe do odbioru zaswiadczenia w moim imieniu.', {
    x: left,
    y,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  })

  y -= 30
  for (const spec of fields) {
    page.drawText(spec.label, { x: left, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) })
    y -= 18

    const field = form.createTextField(spec.name)
    field.setText('')
    field.addToPage(page, {
      x: left,
      y: y - 4,
      width: right - left,
      height: 22,
      borderWidth: 1,
      borderColor: rgb(0.6, 0.6, 0.6),
    })
    y -= 40
  }

  y -= 10
  page.drawText('Podpis osoby udzielajacej upowaznienia: ............................................', {
    x: left,
    y,
    size: 10,
    font,
    color: rgb(0.15, 0.15, 0.15),
  })

  // Use the embedded Unicode font for field appearances too.
  form.updateFieldAppearances(font)

  const bytes = await pdf.save()
  const outPath = join(templatesDir, 'upowaznienie-odbior-zaswiadczenia.pdf')
  await writeFile(outPath, bytes)
  console.log(`Wrote ${outPath} (${fields.length} fields)`)
}

async function main() {
  mkdirSync(templatesDir, { recursive: true })
  await buildUpowaznienie()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
