import { describe, it, expect } from 'vitest'
import { toDisplayCoordinate, fromDisplayCoordinate } from '../../src/domain/coordinates'

describe('Coordinate conversions', () => {
  it('converts 0-based to 1-based display coordinates', () => {
    expect(toDisplayCoordinate(0)).toBe(1)
    expect(toDisplayCoordinate(99)).toBe(100)
  })

  it('converts 1-based display coordinates back to 0-based internal', () => {
    expect(fromDisplayCoordinate(1)).toBe(0)
    expect(fromDisplayCoordinate(100)).toBe(99)
  })
})
