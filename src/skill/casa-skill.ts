import { HaClient } from '../ha/client.js'
import type { CasaConfig, SkillDefinition } from '../types.js'
import { createGetStateTool } from './tools/get-state.js'
import { createSetStateTool } from './tools/set-state.js'
import { createListDevicesTool } from './tools/list-devices.js'
import { createGetHistoryTool } from './tools/get-history.js'
import { createTriggerSceneTool } from './tools/trigger-scene.js'

/**
 * Create the Casa skill definition with all smart home tools.
 */
export function createCasaSkill(config: CasaConfig): SkillDefinition {
  const client = new HaClient(config.haUrl, config.haToken)

  return {
    name: 'casa',
    description: 'Smart home control via Home Assistant',
    version: '2025.1.0',
    tools: [
      createGetStateTool(client),
      createSetStateTool(client),
      createListDevicesTool(client, config.domains),
      createGetHistoryTool(client),
      createTriggerSceneTool(client),
    ],
  }
}
