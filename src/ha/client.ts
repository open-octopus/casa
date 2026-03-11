import type { HaState, HaService } from './types.js'

export class HaClient {
  private baseUrl: string
  private token: string

  constructor(haUrl: string, haToken: string) {
    // Remove trailing slash
    this.baseUrl = haUrl.replace(/\/+$/, '')
    this.token = haToken
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        `Home Assistant API error: ${response.status} ${response.statusText} — ${path}${body ? ` — ${body}` : ''}`,
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Fetch all entity states.
   */
  async getStates(): Promise<HaState[]> {
    return this.request<HaState[]>('/api/states')
  }

  /**
   * Fetch the state of a single entity.
   */
  async getState(entityId: string): Promise<HaState> {
    return this.request<HaState>(`/api/states/${entityId}`)
  }

  /**
   * Call a Home Assistant service.
   */
  async callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await this.request(`/api/services/${domain}/${service}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * Get history for an entity.
   * Returns an array of arrays — one inner array per entity matched.
   */
  async getHistory(
    entityId: string,
    startTime?: string,
  ): Promise<HaState[][]> {
    const start = startTime ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const path = `/api/history/period/${start}?filter_entity_id=${entityId}`
    return this.request<HaState[][]>(path)
  }

  /**
   * List all available services.
   */
  async getServices(): Promise<HaService[]> {
    return this.request<HaService[]>('/api/services')
  }
}
