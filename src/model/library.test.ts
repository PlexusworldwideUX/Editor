import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { OUT_OF_BOX, classifyError } from './library'
import { cloneNew } from './tree'
import { validate } from './validate'
import { buildExport } from '../export/codegen'
import { defaultTheme } from './theme'
import type { DesignNode } from './types'

describe('out-of-box library', () => {
  it('has every level populated', () => {
    const count = (k: string) => OUT_OF_BOX.filter((i) => i.kind === k).length
    expect([count('element'), count('component'), count('object'), count('layout')]).toEqual([13, 13, 10, 4])
  })
  it('classifies every item by what it is built from', () => {
    for (const i of OUT_OF_BOX) expect(classifyError(i), i.name).toBeNull()
  })
  it('ids are unique and every item is rem-compliant', () => {
    expect(new Set(OUT_OF_BOX.map((i) => i.id)).size).toBe(OUT_OF_BOX.length)
    for (const i of OUT_OF_BOX) expect(validate(i.root), i.name).toEqual([])
  })
  it('exports a page holding every item as compilable code', async () => {
    const theme = defaultTheme()
    const page: DesignNode = {
      id: 'p', type: 'container', layout: { base: { direction: 'column', width: { mode: 'fill' } } },
      children: OUT_OF_BOX.map((i) => cloneNew(i.root)),
    }
    const r = await buildExport({ page, library: [], themes: [theme], theme })
    expect(r.errors).toEqual([])
    const zip = await JSZip.loadAsync(await r.zip!.arrayBuffer())
    for (const n of Object.keys(zip.files).filter((n) => !zip.files[n].dir && !/project\.json|package\.json|README/.test(n))) {
      const out = `src/__exported_all__/${n}`
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, Buffer.from(await zip.files[n].async('uint8array')))
    }
    const page_ = await zip.files['src/design/Page.tsx'].async('string')
    expect(page_).not.toMatch(/\d\s*px/)
    expect(page_).toContain("from '@mui/material/TextField'")
    expect(page_).toContain("import asset_image1.svg".replace('.', '_'))
  })
})
