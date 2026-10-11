import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CROPS, cropById } from './crops'

describe('crop catalog', () => {
  it('has exactly 12 crops with complete fields', () => {
    expect(CROPS.length).toBe(12)
    for (const c of CROPS) {
      expect(c.id).toMatch(/^[a-z]+$/)
      expect(c.name.length).toBeGreaterThan(2)
      expect(c.nameHa.length).toBeGreaterThan(2)
      expect(['basket', 'bag', 'sack']).toContain(c.unit)
      expect(c.photo).toBe(`/crops/${c.id}.jpg`)
      expect(c.fallback).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('every photo file exists on disk', () => {
    for (const c of CROPS) {
      expect(existsSync(join(process.cwd(), 'public', 'crops', `${c.id}.jpg`)), c.id).toBe(true)
    }
  })

  it('cropById falls back to a generic entry for unknown crops', () => {
    expect(cropById('tomato').name).toBe('Tomato')
    expect(cropById('mystery').name).toBe('Mystery')
    expect(cropById('mystery').fallback).toBe('#6b7280')
  })
})
