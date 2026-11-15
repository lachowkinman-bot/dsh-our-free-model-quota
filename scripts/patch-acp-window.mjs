#!/usr/bin/env node
/**
 * Patch billion-context's DSH native adapter so it can resolve the real model
 * window from DSH's llm/agentDefaultModel services instead of falling back to
 * a 200K window.
 *
 * Usage:
 *   node scripts/patch-acp-window.mjs <path-to-billion-context/dist/agent/dsh-native.js>
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const target = process.argv[2]

if (typeof target !== 'string' || target.trim() === '') {
  console.error('usage: node scripts/patch-acp-window.mjs <dsh-native.js>')
  process.exit(2)
}

const file = path.resolve(target)
if (!fs.existsSync(file)) {
  console.error(`target not found: ${file}`)
  process.exit(2)
}

const marker = '/* dsh-acp-window-report-patch: inject llm + agentDefaultModel */'
let source = fs.readFileSync(file, 'utf8')

if (source.includes(marker)) {
  console.log(`already patched: ${file}`)
  process.exit(0)
}

const replacements = [
  [
    'var inject=["tools","commands","agents"];',
    'var inject=["tools","commands","agents","llm","agentDefaultModel"];',
  ],
  [
    'if(modelInfo.cached?.provider===provider&&modelInfo.cached?.model===model)return;',
    'if(modelInfo.cached?.provider===provider&&modelInfo.cached?.model===model&&modelInfo.cached?.contextWindow!==void 0)return;',
  ],
  [
    'if(typeof ctx.inject==="function"){try{ctx.inject(["llm","agentDefaultModel"],sub=>{modelInfo.services={llm:sub.llm,agentDefaultModel:sub.agentDefaultModel};refreshModelInfo(register.base??state.origin)})}catch{}}else if(ctx.llm!==void 0||ctx.agentDefaultModel!==void 0){modelInfo.services={llm:ctx.llm,agentDefaultModel:ctx.agentDefaultModel};refreshModelInfo(register.base??state.origin)}',
    'const bindModelInfo=()=>{try{const llm=ctx.llm??ctx.get?.("llm");const agentDefaultModel=ctx.agentDefaultModel??ctx.get?.("agentDefaultModel");if(llm!==void 0||agentDefaultModel!==void 0){modelInfo.services={llm,agentDefaultModel};refreshModelInfo(register.base??state.origin)}}catch{}};if(typeof ctx.inject==="function"){try{ctx.inject(["llm","agentDefaultModel"],sub=>{const llm=sub.llm??sub.get?.("llm");const agentDefaultModel=sub.agentDefaultModel??sub.get?.("agentDefaultModel");modelInfo.services={llm,agentDefaultModel};refreshModelInfo(register.base??state.origin)})}catch{bindModelInfo()}}else{bindModelInfo()}',
  ],
]

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    console.error(`expected patch anchor not found in ${file}`)
    process.exit(1)
  }
  source = source.replace(before, after)
}

const backup = `${file}.bak-window-report-${new Date().toISOString().replace(/[:.]/g, '-')}`
fs.copyFileSync(file, backup)
fs.writeFileSync(file, `${marker}\n${source}`)

execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' })
console.log(`patched: ${file}`)
console.log(`backup: ${backup}`)
