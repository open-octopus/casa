import WebSocket from 'ws'
import type { HaEvent, HaWsMessage } from './types.js'

export type HaWsEventCallback = (event: HaEvent) => void

export class HaWsClient {
  private url: string
  private token: string
  private ws: WebSocket | null = null
  private messageId = 1
  private reconnectAttempts = 0
  private maxReconnectDelay = 30_000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true
  private eventCallbacks: HaWsEventCallback[] = []
  private authenticated = false

  constructor(haUrl: string, haToken: string) {
    // Convert http(s) to ws(s)
    this.url = haUrl
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:')
      .replace(/\/+$/, '')
    this.token = haToken
  }

  /**
   * Connect to Home Assistant WebSocket API.
   */
  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const wsUrl = `${this.url}/api/websocket`
      this.ws = new WebSocket(wsUrl)

      this.ws.on('open', () => {
        this.reconnectAttempts = 0
      })

      this.ws.on('message', (data: WebSocket.Data) => {
        const message: HaWsMessage = JSON.parse(data.toString())

        if (message.type === 'auth_required') {
          this.ws?.send(
            JSON.stringify({ type: 'auth', access_token: this.token }),
          )
          return
        }

        if (message.type === 'auth_ok') {
          this.authenticated = true
          resolve()
          return
        }

        if (message.type === 'auth_invalid') {
          this.shouldReconnect = false
          reject(new Error(`Home Assistant auth failed: ${message.message ?? 'invalid token'}`))
          return
        }

        if (message.type === 'event') {
          const event = message.event as HaEvent
          for (const cb of this.eventCallbacks) {
            cb(event)
          }
        }
      })

      this.ws.on('close', () => {
        this.authenticated = false
        if (this.shouldReconnect) {
          this.scheduleReconnect()
        }
      })

      this.ws.on('error', (err) => {
        if (!this.authenticated) {
          reject(err)
        }
      })
    })
  }

  /**
   * Subscribe to state_changed events.
   */
  async subscribeEvents(callback: HaWsEventCallback): Promise<void> {
    this.eventCallbacks.push(callback)

    if (this.ws && this.authenticated) {
      const id = this.messageId++
      this.ws.send(
        JSON.stringify({
          id,
          type: 'subscribe_events',
          event_type: 'state_changed',
        }),
      )
    }
  }

  /**
   * Close the connection and stop reconnecting.
   */
  close(): void {
    this.shouldReconnect = false
    this.eventCallbacks = []

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.authenticated = false
  }

  /**
   * Whether the client is currently authenticated and connected.
   */
  get isConnected(): boolean {
    return this.authenticated && this.ws?.readyState === WebSocket.OPEN
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      1000 * 2 ** this.reconnectAttempts,
      this.maxReconnectDelay,
    )
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Reconnect will be rescheduled by close handler
      })
    }, delay)
  }
}
