import { describe, it, expect, vi } from 'vitest'
import { discoverDevices } from './device-discovery.js'
import type { HaState } from '../ha/types.js'
import type { HaClient } from '../ha/client.js'

function makeState(entityId: string, state = 'on'): HaState {
  return {
    entity_id: entityId,
    state,
    attributes: { friendly_name: entityId.split('.')[1].replace(/_/g, ' ') },
    last_changed: '2025-01-15T10:00:00Z',
    last_updated: '2025-01-15T10:00:00Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  }
}

function createMockClient(states: HaState[]): HaClient {
  return {
    getStates: vi.fn().mockResolvedValue(states),
  } as unknown as HaClient
}

describe('discoverDevices', () => {
  it('should discover all devices in allowed domains', async () => {
    const client = createMockClient([
      makeState('light.living_room'),
      makeState('switch.office'),
      makeState('climate.thermostat', '22'),
    ])

    const devices = await discoverDevices(client)

    expect(devices).toHaveLength(3)
    expect(devices.map((d) => d.domain)).toEqual(['climate', 'light', 'switch'])
  })

  it('should filter by specified domains', async () => {
    const client = createMockClient([
      makeState('light.living_room'),
      makeState('switch.office'),
      makeState('climate.thermostat'),
    ])

    const devices = await discoverDevices(client, ['light'])

    expect(devices).toHaveLength(1)
    expect(devices[0].domain).toBe('light')
  })

  it('should exclude unsupported domains like automation', async () => {
    const client = createMockClient([
      makeState('light.living_room'),
      makeState('automation.morning_routine'),
      makeState('camera.front_door'),
    ])

    const devices = await discoverDevices(client)

    expect(devices).toHaveLength(1)
    expect(devices[0].entityId).toBe('light.living_room')
  })

  it('should return empty array when no matching devices found', async () => {
    const client = createMockClient([
      makeState('automation.test'),
      makeState('camera.garage'),
    ])

    const devices = await discoverDevices(client)

    expect(devices).toEqual([])
  })

  it('should sort devices by domain then by name', async () => {
    const client = createMockClient([
      makeState('switch.zebra'),
      makeState('light.bedroom'),
      makeState('switch.alpha'),
      makeState('light.alpha'),
    ])

    const devices = await discoverDevices(client)

    expect(devices.map((d) => d.entityId)).toEqual([
      'light.alpha',
      'light.bedroom',
      'switch.alpha',
      'switch.zebra',
    ])
  })

  it('should correctly map HaState to CasaDevice', async () => {
    const client = createMockClient([
      {
        entity_id: 'climate.living_room_thermostat',
        state: '22.5',
        attributes: {
          friendly_name: 'Living Room Thermostat',
          temperature: 22.5,
          hvac_mode: 'heat',
        },
        last_changed: '2025-01-15T10:00:00Z',
        last_updated: '2025-01-15T10:30:00Z',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
    ])

    const devices = await discoverDevices(client)

    expect(devices[0]).toEqual({
      entityId: 'climate.living_room_thermostat',
      domain: 'climate',
      name: 'Living Room Thermostat',
      state: '22.5',
      attributes: {
        friendly_name: 'Living Room Thermostat',
        temperature: 22.5,
        hvac_mode: 'heat',
      },
      lastChanged: '2025-01-15T10:00:00Z',
      lastUpdated: '2025-01-15T10:30:00Z',
    })
  })
})
