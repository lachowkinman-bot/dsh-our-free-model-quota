#!/usr/bin/env node
import assert from 'node:assert/strict'
import { FreeModelAdapter } from '../src/adapter.js'
import { FREE_LANE_QUOTA } from '../src/catalog.js'

const entry = {
  id: 'mimo-v2.6-flash-free',
  name: 'MiMo V2.6 Flash',
  vision: true,
  reasoning: true,
  contextWindow: 1048576,
  maxOutput: 131072,
  canDisableThinking: false,
  quota: FREE_LANE_QUOTA,
}

const adapter = new FreeModelAdapter({
  state: () => ({
    catalog: [entry],
    membership: { 'our-free-model': [entry.id] },
    settings: { defaultMaxTokens: 32768 },
    availability: { results: { [entry.id]: { state: 'throttled' } } },
  }),
  recordUsage: () => {},
  warn: () => {},
})

const models = await adapter.listModels('our-free-model')
assert.equal(models.length, 1)
assert.match(models[0].name, /MiMo V2\.6 Flash · 限流/)
assert.match(models[0].description, /免费额度/)
assert.match(models[0].description, /当前探测：限流/)
assert.match(models[0].description, /可用输入约 896K/)

const resolved = await adapter.resolveModel('our-free-model', entry.id)
assert.equal(resolved.context.contextWindow, 1048576)
assert.match(resolved.name, /限流/)

console.log('quota annotation OK')
