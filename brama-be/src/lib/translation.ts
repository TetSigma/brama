export const languageNames: Record<string, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  cs: 'Czech',
  uk: 'Ukrainian',
  ru: 'Russian',
  de: 'German',
}

export function languageName(lang: string): string {
  return languageNames[lang] ?? lang
}

const translationSystemPrefix =
  'You are a professional translator ' +
  'for a government office. ' +
  "Translate the user's text into "

const translationSystemSuffix =
  '. Output only the translation, nothing else. ' +
  'Keep these VERBATIM in their original Polish form - do NOT translate, ' +
  'transliterate or alter them: names of offices and institutions ' +
  '(e.g. Wydzial Komunikacji, Urzad Miasta Lublin, ZUS, USC), ' +
  'names of documents, applications and forms together with their codes ' +
  '(e.g. MKZ-009, AB-008), street and building addresses ' +
  '(ul., al., plac, pok., + numbers), postal codes, room numbers, ' +
  'phone numbers, e-mail addresses, URLs and bank account numbers, ' +
  'and any double-bracket markers such as [[map]] or [[fee]] - keep them ' +
  'exactly where they are, do not translate, move or remove them. ' +
  'Translate only the surrounding explanatory text and preserve the meaning ' +
  'exactly. Do not add, omit, explain or answer anything.'

export function buildTranslationPrompt(targetLanguage: string): string {
  return translationSystemPrefix + targetLanguage + translationSystemSuffix
}
