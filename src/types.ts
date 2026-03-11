// ── Inline from @openoctopus/shared for standalone use ──

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

export interface SkillDefinition {
  name: string
  description: string
  version: string
  tools: ToolDefinition[]
}

// ── Casa-specific types ──

export const DEVICE_DOMAINS = [
  'light',
  'switch',
  'climate',
  'lock',
  'cover',
  'fan',
  'media_player',
  'sensor',
  'binary_sensor',
] as const

export type DeviceDomain = (typeof DEVICE_DOMAINS)[number]

export function isDeviceDomain(value: string): value is DeviceDomain {
  return DEVICE_DOMAINS.includes(value as DeviceDomain)
}

export interface CasaDevice {
  entityId: string
  domain: DeviceDomain
  name: string
  state: string
  attributes: Record<string, unknown>
  lastChanged: string
  lastUpdated: string
}

export interface CasaConfig {
  haUrl: string
  haToken: string
  autoDiscover: boolean
  pollInterval: number
  domains: DeviceDomain[]
}
