import { describe, it, expect } from 'vitest'
import { generateDeviceSoul } from './device-soul-generator.js'
import type { CasaDevice } from '../types.js'

function makeDevice(
  overrides: Partial<CasaDevice> = {},
): CasaDevice {
  return {
    entityId: 'light.living_room',
    domain: 'light',
    name: 'Living Room Light',
    state: 'on',
    attributes: {},
    lastChanged: '2025-01-15T10:00:00Z',
    lastUpdated: '2025-01-15T10:00:00Z',
    ...overrides,
  }
}

describe('generateDeviceSoul', () => {
  it('should generate soul for a thermostat (climate domain)', () => {
    const device = makeDevice({
      entityId: 'climate.thermostat',
      domain: 'climate',
      name: 'Living Room Thermostat',
      state: '22',
    })

    const soul = generateDeviceSoul(device)

    expect(soul).toContain('# Living Room Thermostat')
    expect(soul).toContain('climate.thermostat')
    expect(soul).toContain('precise about numbers')
    expect(soul).toContain('comfort')
    expect(soul).toContain('temperature changes')
    expect(soul).toContain('**State:** 22')
  })

  it('should generate soul for a lock', () => {
    const device = makeDevice({
      entityId: 'lock.front_door',
      domain: 'lock',
      name: 'Front Door Lock',
      state: 'locked',
    })

    const soul = generateDeviceSoul(device)

    expect(soul).toContain('# Front Door Lock')
    expect(soul).toContain('Vigilant')
    expect(soul).toContain('security-conscious')
    expect(soul).toContain('lock/unlock event')
    expect(soul).toContain('**State:** locked')
  })

  it('should generate soul for a light', () => {
    const device = makeDevice()

    const soul = generateDeviceSoul(device)

    expect(soul).toContain('# Living Room Light')
    expect(soul).toContain('Warm, friendly')
    expect(soul).toContain('mood-aware')
    expect(soul).toContain('lighting adjustments')
  })

  it('should generate soul for a sensor', () => {
    const device = makeDevice({
      entityId: 'sensor.outdoor_temp',
      domain: 'sensor',
      name: 'Outdoor Temperature',
      state: '18.5',
    })

    const soul = generateDeviceSoul(device)

    expect(soul).toContain('# Outdoor Temperature')
    expect(soul).toContain('data-driven')
    expect(soul).toContain('analytical')
    expect(soul).toContain('notable changes')
  })

  it('should include custom device name in the title', () => {
    const device = makeDevice({
      name: 'My Custom Fancy Light',
    })

    const soul = generateDeviceSoul(device)

    expect(soul).toContain('# My Custom Fancy Light')
  })

  it('should include entity ID and realm info', () => {
    const device = makeDevice({
      entityId: 'fan.bedroom',
      domain: 'fan',
      name: 'Bedroom Fan',
    })

    const soul = generateDeviceSoul(device)

    expect(soul).toContain('fan.bedroom')
    expect(soul).toContain('Casa (Smart Home)')
  })

  it('should format binary_sensor domain label without underscore', () => {
    const device = makeDevice({
      entityId: 'binary_sensor.door',
      domain: 'binary_sensor',
      name: 'Door Sensor',
      state: 'off',
    })

    const soul = generateDeviceSoul(device)

    expect(soul).toContain('**Type:** binary sensor')
  })
})
