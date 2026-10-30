import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import JSZip from 'jszip'
import { expect, it } from 'vitest'
import { buildExport, parseThemeFile, themeFileSource } from './codegen'
import { defaultTheme } from '../model/theme'
import { rem } from '../model/rem'
import type { DesignNode, LibraryItem } from '../model/types'

const card: LibraryItem = {
  id: 'c1', name: 'Hero card', kind: 'component', tier: 'designer',
  root: {
    id: 'r', type: 'container', style: { fill: 'background.paper', radius: 'card', shadow: 'md', borderWidth: rem(0.0625) },
    layout: { base: { direction: 'column', gap: rem(1), padding: { top: rem(1), right: rem(1), bottom: rem(1), left: rem(1) } }, tablet: { direction: 'row', gap: 'auto' } },
    children: [
      { id: 't', type: 'text', props: { text: 'Hello', variant: 'h4' }, layout: { base: { width: { mode: 'fill' } } } },
      { id: 'b', type: 'button', props: { text: 'Go', variant: 'contained', color: 'primary', size: 'medium', icon: 'HomeOutlined' }, layout: { base: {} } },
      { id: 'i', type: 'icon', props: { icon: 'Favorite', size: rem(1.5) }, layout: { base: {} } },
    ],
  },
}
const page: DesignNode = {
  id: 'p', type: 'container', layout: { base: { direction: 'column', width: { mode: 'fill' } } },
  children: [{ id: 'x', type: 'instance', ref: 'c1', layout: { base: { width: { mode: 'fill' } } } }],
}

it('exports compliant, compilable code with no px', async () => {
  const theme = defaultTheme()
  theme.colors.push({ id: 'brandPink', name: 'Brand pink', group: 'colour', light: '#ff4081', dark: '#ff80ab' })
  theme.text.push({ id: 'heroTitle', name: 'Hero title', fontId: 'roboto', size: 4000, weight: 700, lineHeight: 1.1, letterSpacing: 0 })
  const r = await buildExport({ page, library: [card], themes: [theme], theme })
  expect(r.errors).toEqual([])
  const zip = await JSZip.loadAsync(await r.zip!.arrayBuffer())
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  expect(names).toEqual(expect.arrayContaining(['src/theme/theme-types.d.ts', 'src/design/Page.tsx', 'src/library/HeroCard.tsx', 'src/theme/theme.ts', 'src/theme/tokens.ts', 'project.json']))
  for (const n of names.filter((n) => n.endsWith('.tsx') || n.endsWith('tokens.ts'))) {
    const text = await zip.files[n].async('string')
    expect(text, n).not.toMatch(/\d\s*px/)
    mkdirSync(dirname(`src/__exported__/${n}`), { recursive: true })
    writeFileSync(`src/__exported__/${n}`, text)
  }
  for (const n of ['src/theme/theme.ts', 'src/theme/theme-types.d.ts']) {
    mkdirSync(dirname(`src/__exported__/${n}`), { recursive: true })
    writeFileSync(`src/__exported__/${n}`, await zip.files[n].async('string'))
  }
})

it('theme file round-trips', () => {
  const t = defaultTheme()
  expect(parseThemeFile(themeFileSource(t, true))).toEqual(t)
})
