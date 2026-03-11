import { z } from 'zod'
import { DEVICE_DOMAINS, type CasaConfig, type DeviceDomain } from './types.js'

const DeviceDomainSchema = z.enum(DEVICE_DOMAINS as unknown as [string, ...string[]])

export const CasaConfigSchema = z.object({
  haUrl: z
    .string()
    .url('HA_URL must be a valid URL')
    .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
      message: 'HA_URL must start with http:// or https://',
    }),
  haToken: z.string().min(1, 'HA_TOKEN must not be empty'),
  autoDiscover: z.boolean().default(true),
  pollInterval: z.number().int().positive().default(30),
  domains: z
    .array(DeviceDomainSchema)
    .default([...DEVICE_DOMAINS]) as z.ZodDefault<z.ZodArray<z.ZodType<DeviceDomain>>>,
})

export function loadCasaConfig(
  overrides: Partial<CasaConfig> = {},
): CasaConfig {
  const raw = {
    haUrl: overrides.haUrl ?? process.env.HA_URL,
    haToken: overrides.haToken ?? process.env.HA_TOKEN,
    autoDiscover: overrides.autoDiscover,
    pollInterval: overrides.pollInterval,
    domains: overrides.domains,
  }

  // Strip undefined keys so Zod defaults apply
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined),
  )

  return CasaConfigSchema.parse(cleaned) as CasaConfig
}
