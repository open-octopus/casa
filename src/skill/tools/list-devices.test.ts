import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HaClient } from '../../ha/client.js'
import type { CasaDevice } from '../../types.js'
import { createListDevicesTool } from './list-devices.js'

vi.mock('../../discovery/device-discovery.js', () => ({
  discoverDevices: vi.fn(),
}))

import { discoverDevices } from '../../discovery/device-discovery.js'

const mockDiscoverDevices = discoverDevices as ReturnType<typeof vi.fn>

function mockClient(): HaClient {
  return {
    getStates: vi.fn(),
    getState: vi.fn(),
    callService: vi.fn(),
    getHistory: vi.fn(),
    getServices: vi.fn(),
  } as unknown as HaClient
}

const MOCK_DEVICE: CasaDevice = {
  entityId: 'light.living_room',
  domain: 'light',
  name: 'Living Room',
  state: 'on',
  attributes: { brightness: 255 },
  lastChanged: '2025-01-15T10:00:00Z',
  lastUpdated: '2025-01-15T10:00:00Z',
}

describe('createListDevicesTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns tool with correct name', () => {
    const tool = createListDevicesTool(mockClient(), ['light', 'switch'])
    expect(tool.name).toBe('casa_list_devices')
  })

  it('lists all devices using default domains when no filter given', async () => {
    const devices: CasaDevice[] = [
      MOCK_DEVICE,
      { ...MOCK_DEVICE, entityId: 'switch.fan', domain: 'switch', name: 'Fan' },
    ]
    mockDiscoverDevices.mockResolvedValue(devices)

    const client = mockClient()
    const tool = createListDevicesTool(client, ['light', 'switch'])

    const result = (await tool.execute({})) as Array<{
      entityId: string
      name: string
      state: string
      domain: string
    }>

    expect(mockDiscoverDevices).toHaveBeenCalledWith(client, ['light', 'switch'])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      entityId: 'light.living_room',
      name: 'Living Room',
      state: 'on',
      domain: 'light',
    })
  })

  it('filters by valid domain', async () => {
    mockDiscoverDevices.mockResolvedValue([MOCK_DEVICE])

    const client = mockClient()
    const tool = createListDevicesTool(client, ['light', 'switch'])

    await tool.execute({ domain: 'light' })

    expect(mockDiscoverDevices).toHaveBeenCalledWith(client, ['light'])
  })

  it('returns error for unknown domain', async () => {
    const client = mockClient()
    const tool = createListDevicesTool(client, ['light'])

    const result = await tool.execute({ domain: 'invalid_domain' })

    expect(result).toEqual({ error: 'Unknown domain: invalid_domain' })
    expect(mockDiscoverDevices).not.toHaveBeenCalled()
  })

  it('returns simplified device objects without extra fields', async () => {
    mockDiscoverDevices.mockResolvedValue([MOCK_DEVICE])

    const tool = createListDevicesTool(mockClient(), ['light'])
    const result = (await tool.execute({})) as Array<Record<string, unknown>>

    // Should NOT include attributes, lastChanged, lastUpdated
    expect(result[0]).not.toHaveProperty('attributes')
    expect(result[0]).not.toHaveProperty('lastChanged')
    expect(result[0]).not.toHaveProperty('lastUpdated')
  })
})
