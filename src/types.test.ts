import { describe, it, expect } from 'vitest'
import {
  DEVICE_DOMAINS,
  isDeviceDomain,
  type CasaDevice,
  type DeviceDomain,
} from './types.js'

describe('types', () => {
  describe('DEVICE_DOMAINS', () => {
    it('should contain all 9 supported domains', () => {
      expect(DEVICE_DOMAINS).toHaveLength(9)
      expect(DEVICE_DOMAINS).toContain('light')
      expect(DEVICE_DOMAINS).toContain('switch')
      expect(DEVICE_DOMAINS).toContain('climate')
      expect(DEVICE_DOMAINS).toContain('lock')
      expect(DEVICE_DOMAINS).toContain('cover')
      expect(DEVICE_DOMAINS).toContain('fan')
      expect(DEVICE_DOMAINS).toContain('media_player')
      expect(DEVICE_DOMAINS).toContain('sensor')
      expect(DEVICE_DOMAINS).toContain('binary_sensor')
    })
  })

  describe('isDeviceDomain', () => {
    it('should return true for valid domains', () => {
      expect(isDeviceDomain('light')).toBe(true)
      expect(isDeviceDomain('climate')).toBe(true)
      expect(isDeviceDomain('lock')).toBe(true)
    })

    it('should return false for invalid domains', () => {
      expect(isDeviceDomain('camera')).toBe(false)
      expect(isDeviceDomain('')).toBe(false)
      expect(isDeviceDomain('unknown')).toBe(false)
    })
  })

  describe('CasaDevice', () => {
    it('should accept a valid CasaDevice shape', () => {
      const device: CasaDevice = {
        entityId: 'light.living_room',
        domain: 'light',
        name: 'Living Room Light',
        state: 'on',
        attributes: { brightness: 255, color_temp: 370 },
        lastChanged: '2025-01-15T10:30:00Z',
        lastUpdated: '2025-01-15T10:30:00Z',
      }

      expect(device.entityId).toBe('light.living_room')
      expect(device.domain).toBe('light')
      expect(device.name).toBe('Living Room Light')
      expect(device.state).toBe('on')
      expect(device.attributes).toHaveProperty('brightness')
    })

    it('should enforce domain type constraint', () => {
      const domain: DeviceDomain = 'climate'
      expect(isDeviceDomain(domain)).toBe(true)
    })
  })
})
