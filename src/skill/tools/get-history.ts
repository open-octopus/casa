import type { HaClient } from '../../ha/client.js'
import type { ToolDefinition } from '../../types.js'

export function createGetHistoryTool(client: HaClient): ToolDefinition {
  return {
    name: 'casa_get_history',
    description: 'Get the state history of a smart home device',
    parameters: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description:
            'Home Assistant entity ID (e.g., sensor.temperature)',
        },
        hours: {
          type: 'number',
          description:
            'Number of hours of history to retrieve (default: 24)',
        },
      },
      required: ['entity_id'],
    },
    execute: async (params) => {
      try {
        const entityId = params.entity_id as string
        const hours = (params.hours as number) ?? 24

        const startTime = new Date(
          Date.now() - hours * 60 * 60 * 1000,
        ).toISOString()

        const history = await client.getHistory(entityId, startTime)

        const entries = (history[0] ?? []).map((entry) => ({
          state: entry.state,
          lastChanged: entry.last_changed,
          attributes: entry.attributes,
        }))

        return {
          entityId,
          hours,
          entries,
          count: entries.length,
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    },
  }
}
