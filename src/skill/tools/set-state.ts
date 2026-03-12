import type { HaClient } from '../../ha/client.js'
import type { ToolDefinition } from '../../types.js'

export function createSetStateTool(client: HaClient): ToolDefinition {
  return {
    name: 'casa_set_state',
    description:
      'Control a smart home device by calling a Home Assistant service',
    parameters: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description:
            'Home Assistant entity ID (e.g., light.living_room)',
        },
        service: {
          type: 'string',
          description:
            'Service to call (e.g., "turn_on", "turn_off", "toggle")',
        },
        service_data: {
          type: 'object',
          description:
            'Optional additional service data (e.g., { "brightness": 200 })',
        },
      },
      required: ['entity_id', 'service'],
    },
    execute: async (params) => {
      try {
        const entityId = params.entity_id as string
        const service = params.service as string
        const serviceData = (params.service_data as Record<string, unknown>) ?? {}

        const domain = entityId.split('.')[0]

        await client.callService(domain, service, {
          entity_id: entityId,
          ...serviceData,
        })

        return {
          success: true,
          entityId,
          service: `${domain}.${service}`,
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    },
  }
}
