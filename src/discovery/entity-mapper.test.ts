import { describe, it, expect } from 'vitest'
import { mapToCasaDevice, mapToOctopusEntity } from './entity-mapper.js'
import type { HaState } from '../ha/types.js'
import type { CasaDevice } from '../types.js'

function makeState(
  entityId: string,
  state = 'on',
  attrs: Record<string, unknown> = {},
): HaState {
  return {
    entity_id: entityId,
    state,
    attributes: attrs,
    last_changed: '2025-01-15T10:00:00Z',
    last_updated: '2025-01-15T10:30:00Z',
    context: { id: 'ctx1', parent_id: null, user_id: null },
  }
}

describe('entity-mapper', () => {
  describe('mapToCasaDevice', () => {
    it('should use friendly_name from attributes if available', () => {
      const state = makeState('light.living_room', 'on', {
        friendly_name: 'Living Room Light',
      })

      const device = mapToCasaDevice(state)

      expect(device.name).toBe('Living Room Light')
      expect(device.entityId).toBe('light.living_room')
      expect(device.domain).toBe('light')
      expect(device.state).toBe('on')
    })

    it('should humanize entity_id when friendly_name is not set', () => {
      const state = makeState('switch.kitchen_outlet', 'off')

      const device = mapToCasaDevice(state)

      expect(device.name).toBe('kitchen outlet')
    })

    it('should map timestamps correctly', () => {
      const state = makeState('sensor.temperature', '21.5')

      const device = mapToCasaDevice(state)

      expect(device.lastChanged).toBe('2025-01-15T10:00:00Z')
      expect(device.lastUpdated).toBe('2025-01-15T10:30:00Z')
    })

    it('should preserve all attributes', () => {
      const state = makeState('climate.thermostat', '22', {
        friendly_name: 'Thermostat',
        temperature: 22,
        hvac_mode: 'heat',
        min_temp: 16,
        max_temp: 30,
      })

      const device = mapToCasaDevice(state)

      expect(device.attributes).toHaveProperty('temperature', 22)
      expect(device.attributes).toHaveProperty('hvac_mode', 'heat')
    })
  })

  describe('mapToOctopusEntity', () => {
    it('should map CasaDevice to OpenOctopus entity with type asset', () => {
      const device: CasaDevice = {
        entityId: 'lock.front_door',
        domain: 'lock',
        name: 'Front Door Lock',
        state: 'locked',
        attributes: {},
        lastChanged: '2025-01-15T10:00:00Z',
        lastUpdated: '2025-01-15T10:00:00Z',
      }

      const entity = mapToOctopusEntity(device)

      expect(entity.type).toBe('asset')
      expect(entity.realm).toBe('casa')
      expect(entity.name).toBe('Front Door Lock')
      expect(entity.metadata.entityId).toBe('lock.front_door')
      expect(entity.metadata.domain).toBe('lock')
      expect(entity.metadata.haState).toBe('locked')
    })
  })
})
