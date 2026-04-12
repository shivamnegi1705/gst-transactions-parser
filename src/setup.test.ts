import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('Project setup verification', () => {
  it('fast-check is working', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        expect(typeof n).toBe('number')
      }),
      { numRuns: 10 }
    )
  })
})
