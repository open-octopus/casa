import type { HaClient } from '../../ha/client.js'
import type { DeviceDomain, ToolDefinition } from '../../types.js'
import { isDeviceDomain } from '../../types.js'
import { discoverDevices } from '../../discovery/device-discovery.js'

export function createListDevicesTool(
  client: HaClient,
  defaultDomains: DeviceDomain[],
): ToolDefinition {
  return {
    name: 'casa_list_devices',
    description: 'List all smart home devices, optionally filtered by domain',
    parameters: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description:
            'Filter by device domain (e.g., "light", "switch", "climate"). Omit to list all.',
        },
      },
    },
    execute: async (params) => {
      const domainFilter = params.domain as string | undefined

      let domains: DeviceDomain[] | undefined
      if (domainFilter && isDeviceDomain(domainFilter)) {
        domains = [domainFilter]
      } else if (!domainFilter) {
        domains = defaultDomains
      } else {
        return { error: `Unknown domain: ${domainFilter}` }
      }

      const devices = await discoverDevices(client, domains)

      return devices.map((d) => ({
        entityId: d.entityId,
        name: d.name,
        state: d.state,
        domain: d.domain,
      }))
    },
  }
}
