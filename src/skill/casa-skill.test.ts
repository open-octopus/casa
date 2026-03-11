import { describe, it, expect } from 'vitest'
import { createCasaSkill } from './casa-skill.js'
import type { CasaConfig } from '../types.js'
import { DEVICE_DOMAINS } from '../types.js'

const TEST_CONFIG: CasaConfig = {
  haUrl: 'http://ha.local:8123',
  haToken: 'test-token',
  autoDiscover: true,
  pollInterval: 30,
  domains: [...DEVICE_DOMAINS],
}

describe('createCasaSkill', () => {
  it('should create a skill with correct metadata', () => {
    const skill = createCasaSkill(TEST_CONFIG)

    expect(skill.name).toBe('casa')
    expect(skill.description).toBe('Smart home control via Home Assistant')
    expect(skill.version).toBe('2025.1.0')
  })

  it('should register exactly 5 tools', () => {
    const skill = createCasaSkill(TEST_CONFIG)

    expect(skill.tools).toHaveLength(5)
  })

  it('should include all expected tool names', () => {
    const skill = createCasaSkill(TEST_CONFIG)
    const names = skill.tools.map((t) => t.name)

    expect(names).toContain('casa_get_state')
    expect(names).toContain('casa_set_state')
    expect(names).toContain('casa_list_devices')
    expect(names).toContain('casa_get_history')
    expect(names).toContain('casa_trigger_scene')
  })

  it('should create tools with descriptions', () => {
    const skill = createCasaSkill(TEST_CONFIG)

    for (const tool of skill.tools) {
      expect(tool.description).toBeTruthy()
      expect(typeof tool.description).toBe('string')
    }
  })

  it('should create tools with execute functions', () => {
    const skill = createCasaSkill(TEST_CONFIG)

    for (const tool of skill.tools) {
      expect(typeof tool.execute).toBe('function')
    }
  })
})
