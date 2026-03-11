import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HaClient } from './client.js'
import type { HaState, HaService } from './types.js'

const MOCK_STATE: HaState = {
  entity_id: 'light.living_room',
  state: 'on',
  attributes: { brightness: 255, friendly_name: 'Living Room' },
  last_changed: '2025-01-15T10:00:00Z',
  last_updated: '2025-01-15T10:00:00Z',
  context: { id: 'ctx1', parent_id: null, user_id: null },
}

const MOCK_SERVICE: HaService = {
  domain: 'light',
  services: {
    turn_on: {
      name: 'Turn on',
      description: 'Turn on a light',
      fields: { brightness: { description: 'Brightness value' } },
    },
  },
}

describe('HaClient', () => {
  let client: HaClient
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    client = new HaClient('http://ha.local:8123', 'test-token')
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should fetch all states', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [MOCK_STATE],
    })

    const states = await client.getStates()

    expect(states).toEqual([MOCK_STATE])
    expect(mockFetch).toHaveBeenCalledWith(
      'http://ha.local:8123/api/states',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
  })

  it('should fetch a single state by entity_id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_STATE,
    })

    const state = await client.getState('light.living_room')

    expect(state).toEqual(MOCK_STATE)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://ha.local:8123/api/states/light.living_room',
      expect.any(Object),
    )
  })

  it('should call a service with correct payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    await client.callService('light', 'turn_on', {
      entity_id: 'light.living_room',
      brightness: 200,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://ha.local:8123/api/services/light/turn_on',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          entity_id: 'light.living_room',
          brightness: 200,
        }),
      }),
    )
  })

  it('should call a service without data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    await client.callService('scene', 'turn_on')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://ha.local:8123/api/services/scene/turn_on',
      expect.objectContaining({
        method: 'POST',
        body: undefined,
      }),
    )
  })

  it('should fetch history for an entity', async () => {
    const historyData = [[MOCK_STATE]]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => historyData,
    })

    const history = await client.getHistory(
      'light.living_room',
      '2025-01-14T00:00:00Z',
    )

    expect(history).toEqual(historyData)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://ha.local:8123/api/history/period/2025-01-14T00:00:00Z?filter_entity_id=light.living_room',
      expect.any(Object),
    )
  })

  it('should fetch services', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [MOCK_SERVICE],
    })

    const services = await client.getServices()

    expect(services).toEqual([MOCK_SERVICE])
  })

  it('should throw on 401 Unauthorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => '401: Unauthorized',
    })

    await expect(client.getStates()).rejects.toThrow(
      'Home Assistant API error: 401 Unauthorized',
    )
  })

  it('should throw on 404 Not Found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Entity not found',
    })

    await expect(
      client.getState('light.nonexistent'),
    ).rejects.toThrow('Home Assistant API error: 404 Not Found')
  })
})
