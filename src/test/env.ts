// Load .env into process.env for integration tests (vitest doesn't do this).
import { readFileSync } from 'node:fs'

try {
  const text = readFileSync(new URL('../../.env', import.meta.url), 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {
  /* no .env — rely on ambient env */
}
