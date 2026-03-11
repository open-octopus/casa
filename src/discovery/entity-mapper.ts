import type { HaState } from '../ha/types.js'
import type { CasaDevice, DeviceDomain } from '../types.js'

/**
 * Convert a Home Assistant state object to a CasaDevice.
 */
export function mapToCasaDevice(state: HaState): CasaDevice {
  const [domain, ...rest] = state.entity_id.split('.')
  const rawName = rest.join('.')

  // Use friendly_name from attributes if available, otherwise humanize the entity ID
  const name =
    (state.attributes.friendly_name as string | undefined) ??
    rawName.replace(/_/g, ' ')

  return {
    entityId: state.entity_id,
    domain: domain as DeviceDomain,
    name,
    state: state.state,
    attributes: state.attributes,
    lastChanged: state.last_changed,
    lastUpdated: state.last_updated,
  }
}

/**
 * Map a CasaDevice to an OpenOctopus Entity shape for integration.
 */
export function mapToOctopusEntity(device: CasaDevice): {
  name: string
  type: 'asset'
  realm: 'casa'
  metadata: {
    entityId: string
    domain: string
    haState: string
  }
} {
  return {
    name: device.name,
    type: 'asset',
    realm: 'casa',
    metadata: {
      entityId: device.entityId,
      domain: device.domain,
      haState: device.state,
    },
  }
}
