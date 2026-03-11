import type { HaClient } from '../ha/client.js'
import type { CasaDevice, DeviceDomain } from '../types.js'
import { isDeviceDomain, DEVICE_DOMAINS } from '../types.js'
import { mapToCasaDevice } from './entity-mapper.js'

/**
 * Discover smart home devices from Home Assistant.
 * Fetches all states, filters by allowed domains, and maps to CasaDevice.
 */
export async function discoverDevices(
  client: HaClient,
  domains?: DeviceDomain[],
): Promise<CasaDevice[]> {
  const allowedDomains = new Set<string>(domains ?? DEVICE_DOMAINS)
  const states = await client.getStates()

  const devices: CasaDevice[] = []

  for (const state of states) {
    const domain = state.entity_id.split('.')[0]

    if (!isDeviceDomain(domain) || !allowedDomains.has(domain)) {
      continue
    }

    devices.push(mapToCasaDevice(state))
  }

  // Sort by domain first, then by name
  devices.sort((a, b) => {
    const domainCmp = a.domain.localeCompare(b.domain)
    if (domainCmp !== 0) return domainCmp
    return a.name.localeCompare(b.name)
  })

  return devices
}
