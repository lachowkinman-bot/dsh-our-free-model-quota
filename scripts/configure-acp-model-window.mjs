#!/usr/bin/env node
/**
 * Pin the free-lane MiMo context window in billion-context's provider route
 * config. This is a deterministic fallback for hosts where runtime-info
 * reporting cannot reach the proxy before the first request.
 *
 * Usage:
 *   node scripts/configure-acp-model-window.mjs [path-to-billion-context.json]
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const file = path.resolve(
  process.argv[2] ?? path.join(os.homedir(), '.config', 'billion-context', 'billion-context.json'),
)

const config = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
  : {}

config.providers ??= {}
config.providers['https://opencode.ai'] ??= {}
config.providers['https://opencode.ai'].models ??= {}
config.providers['https://opencode.ai'].models['mimo-v2.6-flash-free'] = {
  ...config.providers['https://opencode.ai'].models['mimo-v2.6-flash-free'],
  context: 1048576,
  output: 131072,
}

fs.mkdirSync(path.dirname(file), { recursive: true })
if (fs.existsSync(file)) {
  const backup = `${file}.bak-acp-window-${new Date().toISOString().replace(/[:.]/g, '-')}`
  fs.copyFileSync(file, backup)
  console.log(`backup: ${backup}`)
}
fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
console.log(`updated: ${file}`)
