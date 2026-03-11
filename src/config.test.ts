import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadCasaConfig, CasaConfigSchema } from './config.js'
import { DEVICE_DOMAINS } from './types.js'

describe('config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('loadCasaConfig', () => {
    it('should load config from explicit overrides', () => {
      const config = loadCasaConfig({
        haUrl: 'http://192.168.1.100:8123',
        haToken: 'test-token-abc',
      })

      expect(config.haUrl).toBe('http://192.168.1.100:8123')
      expect(config.haToken).toBe('test-token-abc')
    })

    it('should apply defaults for optional fields', () => {
      const config = loadCasaConfig({
        haUrl: 'http://homeassistant.local:8123',
        haToken: 'my-token',
      })

      expect(config.autoDiscover).toBe(true)
      expect(config.pollInterval).toBe(30)
      expect(config.domains).toEqual([...DEVICE_DOMAINS])
    })

    it('should load haUrl and haToken from env vars', () => {
      process.env.HA_URL = 'http://env-host:8123'
      process.env.HA_TOKEN = 'env-token-xyz'

      const config = loadCasaConfig()

      expect(config.haUrl).toBe('http://env-host:8123')
      expect(config.haToken).toBe('env-token-xyz')
    })

    it('should prefer overrides over env vars', () => {
      process.env.HA_URL = 'http://env-host:8123'
      process.env.HA_TOKEN = 'env-token'

      const config = loadCasaConfig({
        haUrl: 'http://override-host:8123',
        haToken: 'override-token',
      })

      expect(config.haUrl).toBe('http://override-host:8123')
      expect(config.haToken).toBe('override-token')
    })

    it('should accept custom pollInterval and domains', () => {
      const config = loadCasaConfig({
        haUrl: 'http://localhost:8123',
        haToken: 'tok',
        pollInterval: 60,
        domains: ['light', 'switch'],
      })

      expect(config.pollInterval).toBe(60)
      expect(config.domains).toEqual(['light', 'switch'])
    })
  })

  describe('CasaConfigSchema validation', () => {
    it('should reject missing haUrl', () => {
      expect(() =>
        CasaConfigSchema.parse({ haToken: 'tok' }),
      ).toThrow()
    })

    it('should reject missing haToken', () => {
      expect(() =>
        CasaConfigSchema.parse({ haUrl: 'http://localhost:8123' }),
      ).toThrow()
    })

    it('should reject empty haToken', () => {
      expect(() =>
        CasaConfigSchema.parse({
          haUrl: 'http://localhost:8123',
          haToken: '',
        }),
      ).toThrow()
    })

    it('should reject invalid URL', () => {
      expect(() =>
        CasaConfigSchema.parse({
          haUrl: 'not-a-url',
          haToken: 'tok',
        }),
      ).toThrow()
    })
  })
})
