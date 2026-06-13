import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isCurrentOfficeholderQuestion } from './query-intent.js'

describe('isCurrentOfficeholderQuestion', () => {
  it('detects Polish questions about the current city president', () => {
    assert.equal(
      isCurrentOfficeholderQuestion('Kto na razie jest prezydentem miasta Lublin?'),
      true,
    )
    assert.equal(
      isCurrentOfficeholderQuestion('Kim jest prezydent miasta lublin na razie?'),
      true,
    )
    assert.equal(isCurrentOfficeholderQuestion('Kto jest prezydentem Lublina?'), true)
    assert.equal(isCurrentOfficeholderQuestion('Obecny prezydent miasta Lublin'), true)
  })

  it('does not catch procedural service questions mentioning the president', () => {
    assert.equal(
      isCurrentOfficeholderQuestion('Jak zlozyc wniosek do Prezydenta Miasta Lublin?'),
      false,
    )
    assert.equal(
      isCurrentOfficeholderQuestion('Gdzie skladane sa wnioski do Prezydenta Miasta Lublin?'),
      false,
    )
  })
})
