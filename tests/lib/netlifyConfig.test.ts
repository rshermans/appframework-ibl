import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const toml = readFileSync(path.resolve(__dirname, '../../netlify.toml'), 'utf8')
const lines = toml.split('\n').filter((line) => !line.trim().startsWith('#'))

describe('netlify.toml (a parse error here fails every deploy before the build starts)', () => {
  it('declares each [table] only once', () => {
    // Merging two branches that both added the same block produced a duplicate [build.environment]
    // and Netlify refused the file: "trying to redefine an already defined table".
    // [[headers]] is an array of tables, so its [headers.values] children legitimately repeat.
    const arrayTables = lines.map((line) => line.match(/^\s*\[\[([^\[\]]+)\]\]\s*$/)?.[1]).filter((n): n is string => Boolean(n))
    const tables = lines
      .map((line) => line.match(/^\s*\[([^\[\]]+)\]\s*$/)?.[1])
      .filter((name): name is string => Boolean(name))
      .filter((name) => !arrayTables.some((array) => name.startsWith(`${array}.`)))
    const duplicates = tables.filter((name, index) => tables.indexOf(name) !== index)
    expect(duplicates).toEqual([])
  })

  it('keeps the build command and the secrets-scan allowlist', () => {
    expect(toml).toMatch(/command\s*=\s*"npm run build"/)
    expect(toml).toMatch(/SECRETS_SCAN_OMIT_KEYS\s*=\s*"[^"]*OPENAI_MODEL[^"]*NEXT_PUBLIC_APP_URL[^"]*"/)
  })

  it('does not redefine the same key twice inside a table', () => {
    let table = ''
    const seen = new Set<string>()
    const repeated: string[] = []
    for (const line of lines) {
      const header = line.match(/^\s*\[{1,2}([^\[\]]+)\]{1,2}\s*$/)
      if (header) {
        table = header[1]
        if (line.trim().startsWith('[[')) seen.add(`${table}#array`)
        continue
      }
      const key = line.match(/^\s*([A-Za-z0-9_-]+)\s*=/)?.[1]
      if (!key) continue
      const id = `${table}.${key}`
      if (seen.has(id) && !table.startsWith('headers')) repeated.push(id)
      seen.add(id)
    }
    expect(repeated).toEqual([])
  })
})
