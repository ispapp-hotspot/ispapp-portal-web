import { describe, it, expect } from 'vitest'
import { validateCpf } from '../../components/portals/shared'

describe('validateCpf', () => {
  it('accepts known valid CPFs', () => {
    expect(validateCpf('529.982.247-25')).toBe(true)
    expect(validateCpf('52998224725')).toBe(true)
    expect(validateCpf('111.444.777-35')).toBe(true)
  })

  it('rejects all-same-digit CPFs', () => {
    for (let d = 0; d <= 9; d++) {
      expect(validateCpf(String(d).repeat(11))).toBe(false)
    }
  })

  it('rejects wrong check digits', () => {
    expect(validateCpf('529.982.247-26')).toBe(false)
    expect(validateCpf('529.982.247-00')).toBe(false)
  })

  it('rejects short or long inputs', () => {
    expect(validateCpf('1234567890')).toBe(false)
    expect(validateCpf('123456789012')).toBe(false)
    expect(validateCpf('')).toBe(false)
  })

  it('rejects null-like / non-digit strings', () => {
    expect(validateCpf('abc.def.ghi-jk')).toBe(false)
  })

  it('strips formatting before validating', () => {
    expect(validateCpf('529.982.247-25')).toBe(true)
    expect(validateCpf('529 982 247 25')).toBe(true) // spaces stripped → same valid CPF
  })
})
