import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { HaEvent } from './types.js'

// Mock the 'ws' module before importing
const mockWsInstances: MockWs[] = []

class MockWs {
  static OPEN = 1
  static CLOSED = 3

  readyState = MockWs.OPEN
  private handlers = new Map<string, ((...args: unknown[]) => void)[]>()
  private closed = false

  constructor(public url: string) {
    mockWsInstances.push(this)
    // Simulate connection open + auth_required on next tick
    setTimeout(() => {
      if (this.closed) return
      this.emit('open')
      this.emit(
        'message',
        JSON.stringify({ type: 'auth_required', ha_version: '2025.1.0' }),
      )
    }, 0)
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    const list = this.handlers.get(event) ?? []
    list.push(handler)
    this.handlers.set(event, list)
  }

  send(data: string): void {
    const msg = JSON.parse(data)
    if (msg.type === 'auth' && msg.access_token === 'valid-token') {
      setTimeout(() => {
        if (this.closed) return
        this.emit('message', JSON.stringify({ type: 'auth_ok' }))
      }, 0)
    } else if (msg.type === 'auth') {
      setTimeout(() => {
        if (this.closed) return
        this.emit(
          'message',
          JSON.stringify({ type: 'auth_invalid', message: 'bad token' }),
        )
      }, 0)
    }
  }

  close(): void {
    this.closed = true
    this.readyState = MockWs.CLOSED
    this.emit('close')
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.handlers.get(event) ?? []
    for (const h of handlers) {
      h(...args)
    }
  }
}

vi.mock('ws', () => ({
  default: MockWs,
  WebSocket: MockWs,
}))

// Import after mock
const { HaWsClient } = await import('./ws-client.js')

describe('HaWsClient', () => {
  beforeEach(() => {
    mockWsInstances.length = 0
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should connect and authenticate successfully', async () => {
    const client = new HaWsClient('http://ha.local:8123', 'valid-token')
    const connectPromise = client.connect()

    await vi.advanceTimersByTimeAsync(10)

    await connectPromise
    expect(client.isConnected).toBe(true)

    client.close()
  })

  it('should convert http URL to ws URL', async () => {
    const client = new HaWsClient('http://ha.local:8123', 'valid-token')
    const connectPromise = client.connect()

    await vi.advanceTimersByTimeAsync(10)
    await connectPromise

    expect(mockWsInstances[0].url).toBe('ws://ha.local:8123/api/websocket')

    client.close()
  })

  it('should convert https URL to wss URL', async () => {
    const client = new HaWsClient('https://ha.local:8123', 'valid-token')
    const connectPromise = client.connect()

    await vi.advanceTimersByTimeAsync(10)
    await connectPromise

    expect(mockWsInstances[0].url).toBe('wss://ha.local:8123/api/websocket')

    client.close()
  })

  it('should reject on auth failure', async () => {
    const client = new HaWsClient('http://ha.local:8123', 'bad-token')
    const connectPromise = client.connect()

    // Attach rejection handler before advancing timers to avoid
    // the unhandled rejection window during timer advancement.
    const rejection = expect(connectPromise).rejects.toThrow('auth failed')

    await vi.advanceTimersByTimeAsync(10)

    await rejection

    client.close()
  })

  it('should subscribe to events and invoke callbacks', async () => {
    const client = new HaWsClient('http://ha.local:8123', 'valid-token')
    const connectPromise = client.connect()

    await vi.advanceTimersByTimeAsync(10)
    await connectPromise

    const callback = vi.fn()
    await client.subscribeEvents(callback)

    const mockEvent: HaEvent = {
      event_type: 'state_changed',
      data: {
        entity_id: 'light.living_room',
        old_state: null,
        new_state: null,
      },
      origin: 'LOCAL',
      time_fired: '2025-01-15T10:00:00Z',
    }

    // Simulate incoming event
    mockWsInstances[0].emit(
      'message',
      JSON.stringify({ type: 'event', event: mockEvent }),
    )

    expect(callback).toHaveBeenCalledWith(mockEvent)

    client.close()
  })

  it('should clean up on close', async () => {
    const client = new HaWsClient('http://ha.local:8123', 'valid-token')
    const connectPromise = client.connect()

    await vi.advanceTimersByTimeAsync(10)
    await connectPromise

    client.close()

    expect(client.isConnected).toBe(false)
  })

  it('should schedule reconnect with exponential backoff', async () => {
    const client = new HaWsClient('http://ha.local:8123', 'valid-token')
    const connectPromise = client.connect()

    await vi.advanceTimersByTimeAsync(10)
    await connectPromise

    // Force close (simulates disconnect) — emit 'close' directly on the
    // underlying mock so the client's close handler fires without marking
    // the MockWs as closed (simulating a network drop, not a graceful close).
    const initialInstances = mockWsInstances.length
    mockWsInstances[0].emit('close')

    // First reconnect after 1s (2^0 * 1000)
    await vi.advanceTimersByTimeAsync(1000)
    expect(mockWsInstances.length).toBeGreaterThan(initialInstances)

    // Let the reconnected instance complete its auth flow
    await vi.advanceTimersByTimeAsync(10)

    client.close()
  })

  it('should not reconnect after explicit close', async () => {
    const client = new HaWsClient('http://ha.local:8123', 'valid-token')
    const connectPromise = client.connect()

    await vi.advanceTimersByTimeAsync(10)
    await connectPromise

    const countBefore = mockWsInstances.length
    client.close()

    // Wait well past any reconnect delay
    await vi.advanceTimersByTimeAsync(5000)
    expect(mockWsInstances.length).toBe(countBefore)
  })
})
