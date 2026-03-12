import type { HaClient } from '../../ha/client.js'
import type { ToolDefinition } from '../../types.js'

export function createTriggerSceneTool(client: HaClient): ToolDefinition {
  return {
    name: 'casa_trigger_scene',
    description: 'Trigger a Home Assistant scene',
    parameters: {
      type: 'object',
      properties: {
        scene_id: {
          type: 'string',
          description:
            'Scene entity ID (e.g., "scene.movie_night")',
        },
      },
      required: ['scene_id'],
    },
    execute: async (params) => {
      try {
        const sceneId = params.scene_id as string

        await client.callService('scene', 'turn_on', {
          entity_id: sceneId,
        })

        return {
          success: true,
          sceneId,
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    },
  }
}
