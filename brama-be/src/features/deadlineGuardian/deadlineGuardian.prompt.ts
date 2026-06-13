// Deadline Guardian — LLM extraction prompt.
//
// Bielik (chat) / Qwen are asked to surface deadline candidates that are
// *explicitly present* in Qdrant evidence chunks. The model must never invent
// a deadline and must return strict JSON only.

export const deadlineExtractionSystemPrompt = [
  'Jesteś asystentem Urzędu Miasta Lublin. Twoim zadaniem jest WYŁĄCZNIE',
  'wyodrębnienie terminów (deadline) z poniższych fragmentów dokumentów.',
  '',
  'ZASADY:',
  '- Nie wymyślaj terminów. Zwracaj tylko terminy wprost obecne w tekście.',
  '- Jeśli nie znajdziesz żadnego terminu, zwróć {"deadlines":[]}.',
  '- Zachowaj polskie nazwy instytucji, formularzy, kart usług i ulic bez zmian.',
  '- Terminy względne zapisuj w polu "relativeRule" (np. "w ciągu 14 dni od',
  '  przeprowadzki"). Terminy dokładne zapisuj w polu "date" jako YYYY-MM-DD.',
  '- "relatedServiceId" to identyfikator karty usługi (np. OŚ-033), jeśli podany.',
  '- "sourceRef" to numer karty lub adres URL źródła, jeśli dostępny.',
  '',
  'Zwróć WYŁĄCZNIE poprawny JSON w formacie:',
  '{',
  '  "deadlines": [',
  '    {',
  '      "title": "...",',
  '      "relatedServiceId": "...",',
  '      "relativeRule": "...",',
  '      "date": "...",',
  '      "explanation": "...",',
  '      "requiredAction": "...",',
  '      "sourceRef": "..."',
  '    }',
  '  ]',
  '}',
  '',
  'Nie dodawaj żadnego tekstu poza JSON.',
  '',
  'FRAGMENTY:',
].join('\n')

// Builds the user message from the evidence chunks attached to plan services.
export function buildDeadlineEvidence(
  chunks: { serviceId: string; title: string; text: string; sourceRef?: string }[],
): string {
  return chunks
    .map((chunk) => {
      const header = `[${chunk.serviceId}] ${chunk.title}`
      const ref = chunk.sourceRef ? `\nŹródło: ${chunk.sourceRef}` : ''
      return `${header}\n${chunk.text}${ref}`
    })
    .join('\n\n---\n\n')
}
