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

it('exports items with states as real CSS and component props', async () => {
  const theme = defaultTheme()
  theme.buttons.styles.push({ ...theme.buttons.styles[0], id: 'danger', name: 'Danger', colorId: 'error' })
  const toggle: LibraryItem = {
    id: 'tg', name: 'Toggle button', kind: 'element', tier: 'designer',
    root: {
      id: 'r', type: 'button', props: { text: 'Toggle', variant: 'outlined', color: 'primary', size: 'medium' }, layout: { base: {} },
      style: { fill: 'background.paper' },
      states: [
        { id: 'hover', name: 'Hover', kind: 'hover', style: { fill: 'divider', shadow: 'md' } },
        { id: 'pressed', name: 'Pressed', kind: 'pressed', style: { fill: 'divider' } },
        { id: 'focus', name: 'Focused', kind: 'focus', style: { borderWidth: 250, borderColor: 'primary.main' } },
        { id: 'disabled', name: 'Disabled', kind: 'disabled', style: { opacity: 0.4 } },
        { id: 'selected', name: 'Selected', kind: 'custom', style: { fill: 'background.default', borderWidth: 250, borderColor: 'primary.main' } },
      ],
    },
  }
  const page: DesignNode = {
    id: 'p', type: 'container', layout: { base: { direction: 'column', width: { mode: 'fill' } } },
    children: [
      { id: 'a', type: 'instance', ref: 'tg', props: { state: 'selected' }, layout: { base: {} } },
      { id: 'b', type: 'instance', ref: 'tg', props: { disabled: true }, layout: { base: {} } },
      { id: 'bb', type: 'button', props: { text: 'Go', buttonStyle: 'danger', size: 'medium' }, layout: { base: {} }, style: { fill: 'background.paper', fillDark: 'custom.dialog' } },
      { id: 'c', type: 'container', props: { state: 'x' }, layout: { base: {} }, states: [{ id: 'x', name: 'X', kind: 'custom', style: { opacity: 0.5 } }] },
    ],
  }
  const r = await buildExport({ page, library: [toggle], themes: [theme], theme })
  expect(r.errors).toEqual([])
  const zip = await JSZip.loadAsync(await r.zip!.arrayBuffer())
  const lib = await zip.files['src/library/ToggleButton.tsx'].async('string')
  expect(lib).toContain('"&:hover"')
  expect(lib).toContain('"&:active"')
  expect(lib).toContain('"&:focus-visible, &.Mui-focusVisible"')
  expect(lib).toContain('"&:disabled, &.Mui-disabled, &[aria-disabled=\\"true\\"]"')
  expect(lib).toContain('"&[data-state=\\"selected\\"]"')
  expect(lib).toContain('state?: "selected"')
  expect(lib).toContain('disabled={disabled}')
  expect(lib).toContain('data-state={state}')
  const pg = await zip.files['src/design/Page.tsx'].async('string')
  expect(pg).toContain('state="selected"')
  expect(pg).toMatch(/<ToggleButton[^>]* disabled/)
  expect(pg).toContain('data-state="x"')
  expect(pg).toContain('variant="danger"')
  expect(pg).toContain('(theme: Theme) => (theme.palette.mode === ' + "'dark'" + ' ? ' + JSON.stringify('custom.dialog') + ' : ' + JSON.stringify('background.paper') + ')')
  expect(await zip.files['src/theme/theme-types.d.ts'].async('string')).toContain('ButtonPropsVariantOverrides')
  for (const n of ['src/design/Page.tsx', 'src/library/ToggleButton.tsx', 'src/theme/tokens.ts', 'src/theme/theme.ts', 'src/theme/theme-types.d.ts']) {
    mkdirSync(dirname(`src/__exported__/${n}`), { recursive: true })
    writeFileSync(`src/__exported__/${n}`, await zip.files[n].async('string'))
  }
})
