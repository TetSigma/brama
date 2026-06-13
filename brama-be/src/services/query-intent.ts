function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function isCurrentOfficeholderQuestion(message: string): boolean {
  const query = normalizeQuery(message)
  if (query.length === 0) {
    return false
  }

  const asksWho = /\b(kto|kim|who)\b/.test(query)
  const asksCurrent =
    /\b(aktualn\w*|obecn\w*|teraz|terazniejsz\w*|dzis|dzisiejsz\w*|currently|current)\b|\bna razie\b/.test(
      query,
    )
  const asksOffice =
    /\b(prezydent(?:em|a|owi| miasta)?|burmistrz(?:em|a|owi)?|mayor|president)\b/.test(
      query,
    )
  const asksRoleHolder =
    asksWho &&
    (/\b(jest|pelni|sprawuje|zostal\w*|wybran\w*|nazywa|is|serves)\b/.test(query) ||
      /^(?:kto|kim)\s+(?:aktualn\w*\s+|obecn\w*\s+)?(?:prezydent|burmistrz|mayor|president)\b/.test(
        query,
      ))

  return asksOffice && (asksRoleHolder || asksCurrent)
}
