#!/usr/bin/env node
/**
 * Pin every dsh-our-free-model catalog entry's context window in
 * billion-context's provider route config. This is a deterministic fallback for
 * hosts where runtime-info reporting cannot reach the proxy before the first
 * request, so a 194K conversation is not mistaken for a 167K overflow.
 *
 * Usage:
 *   node scripts/configure-acp-model-window.mjs [billion-context.json] [catalog.json]
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildCatalog } from '../src/catalog.js'

const file = path.resolve(
  process.argv[2] ?? path.join(os.homedir(), '.config', 'billion-context', 'billion-context.json'),
)
const catalogFile = path.resolve(
  process.argv[3]
    ?? process.env.OUR_FREE_MODEL_CATALOG
    ?? path.join(
      process.env.LOCALAPPDATA ?? '',
      'Programs',
      'UniversalWorkbench',
      '.dsh-home',
      'our-free-model',
      'catalog.json',
    ),
)

const config = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
  : {}
if (!fs.existsSync(catalogFile)) {
  console.error(`catalog not found: ${catalogFile}`)
  process.exit(2)
}
const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8').replace(/^\uFEFF/, ''))

const number = value => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined)
const outputReserve = value => Math.min(number(value) ?? 32768, 32768)

function route(provider) {
  config.providers[provider] ??= {}
  config.providers[provider].models ??= {}
  return config.providers[provider].models
}

config.providers ??= {}

const freeLane = route('https://opencode.ai')
for (const entry of buildCatalog(catalog.entries ?? [])) {
  freeLane[entry.id] = {
    ...freeLane[entry.id],
    context: number(entry.contextWindow),
    output: outputReserve(entry.maxOutput),
  }
}

const kiloLane = route('https://api.kilo.ai/api/gateway')
for (const row of catalog.kiloRows ?? []) {
  if (typeof row?.id !== 'string' || row.id === '') continue
  kiloLane[row.id] = {
    ...kiloLane[row.id],
    context: number(row.contextWindow),
    output: outputReserve(row.maxOutput),
  }
}

fs.mkdirSync(path.dirname(file), { recursive: true })
if (fs.existsSync(file)) {
  const backup = `${file}.bak-acp-window-${new Date().toISOString().replace(/[:.]/g, '-')}`
  fs.copyFileSync(file, backup)
  console.log(`backup: ${backup}`)
}
fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
console.log(`updated: ${file}`)
console.log(`free-lane models: ${Object.keys(freeLane).length}`)
console.log(`kilo-lane models: ${Object.keys(kiloLane).length}`)
