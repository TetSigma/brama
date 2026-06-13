import type { ChatStreamEvent, SendChatInput } from '@/@types/chat'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Canned Polish answer modelled on a real BIP service (dowód osobisty). */
const MOCK_PROSE = [
  'Aby wyrobić dowód osobisty w Lublinie, składasz wniosek w Wydziale Spraw ',
  'Administracyjnych. Poniżej znajdziesz wymagane dokumenty, opłatę, termin ',
  'oraz miejsce złożenia wniosku. ',
]

const MOCK_BLOCKS = [
  {
    type: 'serviceHeader',
    name: 'Wydanie dowodu osobistego',
    cardNumber: 'SA-001',
    department: 'Wydział Spraw Administracyjnych',
    status: 'active',
  },
  {
    type: 'documents',
    title: 'Wymagane dokumenty',
    items: [
      'Wypełniony wniosek o wydanie dowodu osobistego',
      'Aktualna fotografia (35 × 45 mm)',
      'Dotychczasowy dowód osobisty lub ważny paszport',
    ],
  },
  {
    type: 'downloadForm',
    forms: [
      {
        name: 'SA-001-01 — wniosek o wydanie dowodu osobistego.pdf',
        url: 'https://bip.lublin.eu/download/sa-001-01.pdf',
      },
    ],
  },
  { type: 'fee', amount: 'bezpłatne', note: 'Brak opłaty skarbowej za wydanie dowodu.' },
  { type: 'deadline', kind: 'resolution', value: 'do 30 dni' },
  {
    type: 'place',
    kind: 'submit',
    address: 'Biuro Obsługi Mieszkańców, ul. Wieniawska 14, 20-071 Lublin',
    phone: '81 466 1002',
    hours: 'pon 7:45–16:45, wt–pt 7:45–15:15',
  },
  {
    type: 'collapsible',
    variant: 'legalBasis',
    title: 'Podstawa prawna',
    body: 'Ustawa z dnia 6 sierpnia 2010 r. o dowodach osobistych (Dz. U. z 2022 r. poz. 671).',
  },
  {
    type: 'relatedServices',
    services: [
      { label: 'Zameldowanie na pobyt stały', query: 'Jak się zameldować na pobyt stały?' },
      { label: 'Wyrobienie paszportu', query: 'Jak wyrobić paszport?' },
    ],
  },
  {
    type: 'citations',
    sources: [
      {
        label: 'BIP Lublin — Wydanie dowodu osobistego (SA-001)',
        url: 'https://bip.lublin.eu/e-urzad/opisy-uslug/wydanie-dowodu-osobistego.html',
      },
    ],
    updatedAt: '2025-11-07',
  },
  { type: 'feedbackPrompt', answerId: 'mock-answer-1' },
] as const

export async function* streamMockChat(
  _input: SendChatInput,
): AsyncGenerator<ChatStreamEvent> {
  await delay(200)

  for (const chunk of MOCK_PROSE) {
    // Stream word-by-word for a natural typing feel.
    for (const word of chunk.match(/\S+\s*/g) ?? [chunk]) {
      await delay(28)
      yield { type: 'token', delta: word }
    }
  }

  await delay(120)
  yield { type: 'blocks', blocks: MOCK_BLOCKS }

  const answerId = `${_input.conversationId}-answer-${MOCK_PROSE.length}`
  yield { type: 'meta', answerId, grounded: true }
  yield { type: 'done' }
}
