#!/usr/bin/env node
/**
 * Remove upstream-bundled Google OAuth defaults from the vendored channel pack.
 * Users can still supply their own credentials through
 * CMDC_PAK_GOOGLE_CLIENT_ID / CMDC_PAK_GOOGLE_CLIENT_SECRET.
 */

import fs from 'node:fs'
import path from 'node:path'

const file = path.resolve(process.argv[2] ?? 'vendor/channel-pack/pack.js')
let source = fs.readFileSync(file, 'utf8')

const replacements = [
  [/var GEMINI_DEFAULT_CLIENT_ID = "[^"]*";/, 'var GEMINI_DEFAULT_CLIENT_ID = "";'],
  [/var GEMINI_DEFAULT_CLIENT_SECRET = "[^"]*";/, 'var GEMINI_DEFAULT_CLIENT_SECRET = "";'],
]

let changed = 0
for (const [pattern, replacement] of replacements) {
  const next = source.replace(pattern, replacement)
  if (next !== source) changed += 1
  source = next
}

if (changed === 0) {
  console.log('vendor OAuth defaults already redacted')
  process.exit(0)
}

fs.writeFileSync(file, source)
console.log(`redacted ${changed} vendor OAuth default(s): ${file}`)
