import { describe, expect, it } from 'vitest';

import es from './messages/es.json';

/**
 * Voseo forms that had actually made it into the copy, plus the rest of the
 * everyday paradigm. Present indicative (`tenés`), imperative (`elegí`), the
 * copula (`sos`) and the pronoun (`vos`).
 *
 * ponytail: a deny-list, not a conjugator. It catches the forms that keep
 * showing up; something like `refrescás` would slip through. Deriving voseo
 * from the accent alone is not possible — `estás` and `agregarás` are correct
 * tuteo with the same ending — so the honest upgrade path is adding words
 * here, not a cleverer regex.
 */
const VOSEO = [
  // present indicative
  'sos',
  'tenés',
  'querés',
  'podés',
  'sabés',
  'hacés',
  'ponés',
  'debés',
  'cerrás',
  'prendés',
  'necesitás',
  'decís',
  'vivís',
  'venís',
  'salís',
  'elegís',
  // imperative
  'abrí',
  'anotá',
  'apagá',
  'dejá',
  'elegí',
  'empezá',
  'mantené',
  'registrá',
  'revisá',
  'sacá',
  'mirá',
  'fijate',
  'dejame',
  'ponete',
  'acordate',
  'andá',
  // pronoun
  'vos',
];

/** Every leaf string in the bundle, with the key that holds it. */
function flatten(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    flatten(value, path ? `${path}.${key}` : key),
  );
}

describe('the Spanish bundle speaks neutral Spanish', () => {
  // Tuteo, never voseo, and no country-marked slang. Product copy, so it is
  // not something a code review reliably catches — a scan does.
  it.each(VOSEO)('uses no voseo: %s', (word) => {
    const pattern = new RegExp(`(^|[^\\p{L}])${word}($|[^\\p{L}])`, 'iu');
    const offenders = flatten(es)
      .filter(([, text]) => pattern.test(text))
      .map(([key, text]) => `${key}: ${text}`);

    expect(offenders).toEqual([]);
  });

  it('says aquí, not acá', () => {
    // Not voseo, but country-marked, and the bundle already says `aquí`
    // everywhere else.
    const offenders = flatten(es)
      .filter(([, text]) => /(^|[^\p{L}])acá($|[^\p{L}])/iu.test(text))
      .map(([key]) => key);

    expect(offenders).toEqual([]);
  });
});
