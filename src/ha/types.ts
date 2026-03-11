export interface HaState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed: string
  last_updated: string
  context: {
    id: string
    parent_id: string | null
    user_id: string | null
  }
}

export interface HaService {
  domain: string
  services: Record<
    string,
    {
      name: string
      description: string
      fields: Record<string, unknown>
    }
  >
}

export interface HaEvent {
  event_type: string
  data: {
    entity_id: string
    old_state: HaState | null
    new_state: HaState | null
  }
  origin: string
  time_fired: string
}

export interface HaWsMessage {
  id?: number
  type: string
  [key: string]: unknown
}
