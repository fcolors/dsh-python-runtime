// dsh-python-runtime — discovers the DSH Python environment and exposes it as
// managed DSH_* shell facts on every model shell call, via dsh-shell-env.
//
// Resolution order (stops at the first hit):
//   1. Environment fact: DSH_PYTHON_ENV in the process environment
//      ($DSH_HOME/.env machine defaults are loaded into it at launch).
//   2. Config fallback: the DSH_PYTHON_ENV line in $DSH_HOME/.env.
//   3. Absent: contributes nothing — the model reports the DSH Python
//      environment as unavailable instead of silently using system Python.
//
// Sanitization: only the named DSH_PYTHON_ENV line is ever read from config
// files; other lines, secrets, and credential files are never read or echoed.

import { existsSync, readFileSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { homedir } from 'node:os'

function resolveDshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function readConfigPythonEnv(file) {
  try {
    if (!existsSync(file)) return undefined
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*DSH_PYTHON_ENV\s*=\s*(.+?)\s*$/)
      if (!match) continue
      let value = match[1]
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      return value || undefined
    }
  } catch {
    // unreadable config counts as not found; never leak file contents
  }
  return undefined
}

function resolvePythonEnv() {
  const fromEnv = process.env.DSH_PYTHON_ENV
  if (fromEnv) return fromEnv
  return readConfigPythonEnv(join(resolveDshHome(), '.env'))
}

function findUv() {
  const path = process.env.PATH || ''
  for (const dir of path.split(delimiter)) {
    if (!dir) continue
    const candidate = join(dir, process.platform === 'win32' ? 'uv.exe' : 'uv')
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

function pythonEnvSnapshot() {
  const snapshot = {}
  const envPath = resolvePythonEnv()
  if (envPath) {
    snapshot.DSH_PYTHON_ENV = envPath
    const interpreter =
      process.platform === 'win32'
        ? join(envPath, 'Scripts', 'python.exe')
        : join(envPath, 'bin', 'python')
    if (existsSync(interpreter)) snapshot.DSH_PYTHON = interpreter
  }
  const uv = findUv()
  if (uv) snapshot.DSH_UV = uv
  return snapshot
}

export const inject = ['shellEnv']

export function apply(ctx) {
  ctx.shellEnv.register({
    name: 'python-runtime',
    variables: {
      DSH_PYTHON_ENV: {
        description: 'Absolute path of the DSH Python environment root; absent when undiscovered.',
      },
      DSH_PYTHON: {
        description: 'Absolute path of the python interpreter inside DSH_PYTHON_ENV; absent when the interpreter is missing.',
      },
      DSH_UV: {
        description: 'Absolute path of uv when found on PATH; prefer uv mode for package work when present.',
      },
    },
    resolve: (execution) =>
      execution.agent === undefined ? {} : pythonEnvSnapshot(),
  })
}
