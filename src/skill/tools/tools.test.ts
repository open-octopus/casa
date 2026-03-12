import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HaClient } from '../../ha/client.js'
import type { HaState } from '../../ha/types.js'
import { createGetStateTool } from './get-state.js'
import { createSetStateTool } from './set-state.js'
import { createGetHistoryTool } from './get-history.js'
import { createTriggerSceneTool } from './trigger-scene.js'

function mockClient(overrides: Partial<HaClient> = {}): HaClient {
  return {
    getStates: vi.fn(),
    getState: vi.fn(),
    callService: vi.fn(),
    getHistory: vi.fn(),
    getServices: vi.fn(),
    ...overrides,
  } as unknown as HaClient
}

const MOCK_STATE: HaState = {
  entity_id: 'light.living_room',
  state: 'on',
  attributes: { brightness: 255, friendly_name: 'Living Room' },
  last_changed: '2025-01-15T10:00:00Z',
  last_updated: '2025-01-15T10:00:00Z',
  context: { id: 'ctx1', parent_id: null, user_id: null },
}

// ── get-state ────────────────────────────────────────────────────────

describe('createGetStateTool', () => {
  it('returns tool with correct name and required params', () => {
    const tool = createGetStateTool(mockClient())
    expect(tool.name).toBe('casa_get_state')
    expect(tool.parameters).toEqual(
      expect.objectContaining({
        required: ['entity_id'],
      }),
    )
  })

  it('execute returns simplified state object', async () => {
    const client = mockClient({
      getState: vi.fn().mockResolvedValue(MOCK_STATE),
    })
    const tool = createGetStateTool(client)

    const result = await tool.execute({ entity_id: 'light.living_room' })

    expect(result).toEqual({
      entityId: 'light.living_room',
      state: 'on',
      attributes: { brightness: 255, friendly_name: 'Living Room' },
    })
    expect(client.getState).toHaveBeenCalledWith('light.living_room')
  })

  it('propagates client errors', async () => {
    const client = mockClient({
      getState: vi.fn().mockRejectedValue(new Error('404 Not Found')),
    })
    const tool = createGetStateTool(client)

    await expect(
      tool.execute({ entity_id: 'light.nonexistent' }),
    ).rejects.toThrow('404 Not Found')
  })
})

// ── set-state ────────────────────────────────────────────────────────

describe('createSetStateTool', () => {
  it('returns tool with correct name and required params', () => {
    const tool = createSetStateTool(mockClient())
    expect(tool.name).toBe('casa_set_state')
    expect(tool.parameters).toEqual(
      expect.objectContaining({
        required: ['entity_id', 'service'],
      }),
    )
  })

  it('calls service with domain extracted from entity_id', async () => {
    const client = mockClient({
      callService: vi.fn().mockResolvedValue(undefined),
    })
    const tool = createSetStateTool(client)

    const result = await tool.execute({
      entity_id: 'light.living_room',
      service: 'turn_on',
    })

    expect(client.callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.living_room',
    })
    expect(result).toEqual({
      success: true,
      entityId: 'light.living_room',
      service: 'light.turn_on',
    })
  })

  it('merges service_data into call', async () => {
    const client = mockClient({
      callService: vi.fn().mockResolvedValue(undefined),
    })
    const tool = createSetStateTool(client)

    await tool.execute({
      entity_id: 'light.bedroom',
      service: 'turn_on',
      service_data: { brightness: 128, color_name: 'blue' },
    })

    expect(client.callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.bedroom',
      brightness: 128,
      color_name: 'blue',
    })
  })

  it('works without service_data', async () => {
    const client = mockClient({
      callService: vi.fn().mockResolvedValue(undefined),
    })
    const tool = createSetStateTool(client)

    const result = await tool.execute({
      entity_id: 'switch.fan',
      service: 'toggle',
    })

    expect(client.callService).toHaveBeenCalledWith('switch', 'toggle', {
      entity_id: 'switch.fan',
    })
    expect(result).toEqual({
      success: true,
      entityId: 'switch.fan',
      service: 'switch.toggle',
    })
  })
})

// ── get-history ──────────────────────────────────────────────────────

describe('createGetHistoryTool', () => {
  it('returns tool with correct name and required params', () => {
    const tool = createGetHistoryTool(mockClient())
    expect(tool.name).toBe('casa_get_history')
    expect(tool.parameters).toEqual(
      expect.objectContaining({
        required: ['entity_id'],
      }),
    )
  })

  it('returns flattened history entries with default 24h', async () => {
    const historyEntries: HaState[] = [
      { ...MOCK_STATE, state: 'on', last_changed: '2025-01-15T08:00:00Z' },
      { ...MOCK_STATE, state: 'off', last_changed: '2025-01-15T10:00:00Z' },
    ]
    const client = mockClient({
      getHistory: vi.fn().mockResolvedValue([historyEntries]),
    })
    const tool = createGetHistoryTool(client)

    const result = (await tool.execute({
      entity_id: 'light.living_room',
    })) as { entityId: string; hours: number; entries: unknown[]; count: number }

    expect(result.entityId).toBe('light.living_room')
    expect(result.hours).toBe(24)
    expect(result.count).toBe(2)
    expect(result.entries).toEqual([
      {
        state: 'on',
        lastChanged: '2025-01-15T08:00:00Z',
        attributes: MOCK_STATE.attributes,
      },
      {
        state: 'off',
        lastChanged: '2025-01-15T10:00:00Z',
        attributes: MOCK_STATE.attributes,
      },
    ])
  })

  it('passes custom hours parameter', async () => {
    const client = mockClient({
      getHistory: vi.fn().mockResolvedValue([[]]),
    })
    const tool = createGetHistoryTool(client)

    const result = (await tool.execute({
      entity_id: 'sensor.temp',
      hours: 6,
    })) as { hours: number; count: number }

    expect(result.hours).toBe(6)
    expect(result.count).toBe(0)
    // Verify getHistory was called with a start time ~6h ago
    const call = (client.getHistory as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toBe('sensor.temp')
    // The start time should be an ISO string
    expect(call[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('handles empty history (no entries)', async () => {
    const client = mockClient({
      getHistory: vi.fn().mockResolvedValue([]),
    })
    const tool = createGetHistoryTool(client)

    const result = (await tool.execute({
      entity_id: 'sensor.humidity',
    })) as { count: number; entries: unknown[] }

    expect(result.count).toBe(0)
    expect(result.entries).toEqual([])
  })
})

// ── trigger-scene ────────────────────────────────────────────────────

describe('createTriggerSceneTool', () => {
  it('returns tool with correct name and required params', () => {
    const tool = createTriggerSceneTool(mockClient())
    expect(tool.name).toBe('casa_trigger_scene')
    expect(tool.parameters).toEqual(
      expect.objectContaining({
        required: ['scene_id'],
      }),
    )
  })

  it('calls scene.turn_on with entity_id', async () => {
    const client = mockClient({
      callService: vi.fn().mockResolvedValue(undefined),
    })
    const tool = createTriggerSceneTool(client)

    const result = await tool.execute({ scene_id: 'scene.movie_night' })

    expect(client.callService).toHaveBeenCalledWith('scene', 'turn_on', {
      entity_id: 'scene.movie_night',
    })
    expect(result).toEqual({
      success: true,
      sceneId: 'scene.movie_night',
    })
  })

  it('propagates service call errors', async () => {
    const client = mockClient({
      callService: vi.fn().mockRejectedValue(new Error('Service unavailable')),
    })
    const tool = createTriggerSceneTool(client)

    await expect(
      tool.execute({ scene_id: 'scene.nonexistent' }),
    ).rejects.toThrow('Service unavailable')
  })
})
