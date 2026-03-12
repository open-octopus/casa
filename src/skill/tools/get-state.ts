import type { HaClient } from '../../ha/client.js'
import type { ToolDefinition } from '../../types.js'

export function createGetStateTool(client: HaClient): ToolDefinition {
  return {
    name: 'casa_get_state',
    description: 'Get the current state of a smart home device',
    parameters: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description:
            'Home Assistant entity ID (e.g., light.living_room)',
        },
      },
      required: ['entity_id'],
    },
    execute: async (params) => {
      try {
        const state = await client.getState(params.entity_id as string)
        return {
          entityId: state.entity_id,
          state: state.state,
          attributes: state.attributes,
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    },
  }
}
