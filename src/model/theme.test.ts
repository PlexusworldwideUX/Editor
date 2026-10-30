import { describe, expect, it } from 'vitest'
import { TONES, buttonStyleOf, changedIds, contrast, defaultTheme, genTones, isTheme, rating, resolveColor, themeOptions, upgradeTheme, type Theme } from './theme'
import { rem } from './rem'

describe('colour scale', () => {
  it('tone 500 is the base and the scale runs light to dark', () => {
    const t = genTones('#1976d2')
    expect(t['500']).toBe('#1976d2')
    expect(Object.keys(t)).toHaveLength(TONES.length)
    expect(contrast(t['50'], '#ffffff')).toBeLessThan(contrast(t['950'], '#ffffff'))
  })
  it('computes WCAG contrast', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 0)
    expect(rating(4.6)).toEqual({ aa: true, aaa: false })
  })
  it('light and dark modes use their own tone picks', () => {
    const c = defaultTheme().colors.find((x) => x.id === 'primary')!
    expect(resolveColor(c, 'light').main).toBe(c.tones!['500'])
    expect(resolveColor(c, 'dark').main).toBe(c.tones!['300'])
  })
})

describe('theme upgrade', () => {
  it('brings an older saved theme up to date without changing its colours', () => {
    const d = defaultTheme()
    const old = {
      id: 'old', name: 'Old', fonts: d.fonts, spacingUnit: rem(0.5), spacing: [], radius: [{ id: 'control', name: 'Control', value: rem(0.25), core: true }],
      shadows: [], text: d.text.filter((s) => s.id !== 'button'),
      colors: [{ id: 'primary', name: 'Primary', group: 'colour', light: '#ff0000', dark: '#ff9999', core: true }],
      buttons: { textTransform: 'none', weight: 500, radius: 'control', shadow: 'none', pad: d.buttons.pad },
    } as unknown as Theme
    expect(isTheme(old)).toBe(true)
    const up = upgradeTheme(old)
    const p = up.colors.find((c) => c.id === 'primary')!
    expect(p.light).toBe('#ff0000')
    expect(p.tones!['500']).toBe('#ff0000')
    expect(up.buttons.styles.map((x) => x.id)).toEqual(['primary', 'secondary', 'outline', 'text'])
    expect(up.buttons.styles[0].radius).toBe('control')
    expect(up.text.some((s) => s.id === 'button')).toBe(true)
    expect(up.mainFontId).toBe('roboto')
  })
})

describe('surfaces and button styles', () => {
  it('surface roles drive the library masters, so alerts and dialogs are editable', () => {
    const t = defaultTheme()
    const o = themeOptions(t, 'light') as never as { components: { MuiAlert: { styleOverrides: { standardError: { backgroundColor: string } } }; MuiDialog: { styleOverrides: { paper: { backgroundColor: string } } } } }
    expect(o.components.MuiAlert.styleOverrides.standardError.backgroundColor).toBe(t.colors.find((c) => c.id === 'alertError')!.light)
    expect(o.components.MuiDialog.styleOverrides.paper.backgroundColor).toBe('#ffffff')
  })
  it('a surface that follows a colour tone updates when the colour changes', async () => {
    const { syncSurfaces, genTones } = await import('./theme')
    const t = defaultTheme()
    const before = t.colors.find((c) => c.id === 'alertError')!.light
    const edited = syncSurfaces({ ...t, colors: t.colors.map((c) => (c.id === 'error' ? { ...c, tones: genTones('#00aa00') } : c)) })
    expect(edited.colors.find((c) => c.id === 'alertError')!.light).not.toBe(before)
    expect(edited.colors.find((c) => c.id === 'alertError')!.light).toBe(genTones('#00aa00')['50'])
  })
  it('a new button style becomes its own variant in the theme and resolves by id', () => {
    const t = defaultTheme()
    t.buttons.styles.push({ ...t.buttons.styles[0], id: 'danger', name: 'Danger', colorId: 'error' })
    const o = JSON.parse(JSON.stringify(themeOptions(t, 'light')))
    const v = o.components.MuiButton.variants.find((x: { props: { variant: string } }) => x.props.variant === 'danger')
    expect(v.style.backgroundColor).toBe(t.colors.find((c) => c.id === 'error')!.tones!['500'])
    expect(buttonStyleOf(t, { buttonStyle: 'danger' }).id).toBe('danger')
    expect(buttonStyleOf(t, { variant: 'outlined', color: 'primary' }).id).toBe('outline')
  })
  it('dark mode uses automatic roles until given its own', () => {
    const t = defaultTheme()
    const st = t.buttons.styles[0]
    const d = JSON.parse(JSON.stringify(themeOptions(t, 'dark')))
    expect(d.components.MuiButton.variants[0].style.backgroundColor).toBe(t.colors.find((c) => c.id === 'primary')!.tones!['300'])
    st.dark = { enabled: { fill: 'light' } } // only this one cell is overridden
    const d2 = JSON.parse(JSON.stringify(themeOptions(t, 'dark')))
    expect(d2.components.MuiButton.variants[0].style.backgroundColor).toBe(t.colors.find((c) => c.id === 'primary')!.tones!['200'])
    // every other cell still follows Light
    expect(d2.components.MuiButton.variants[0].style['&:hover'].backgroundColor).toBe(d.components.MuiButton.variants[0].style['&:hover'].backgroundColor)
  })
  it('a part can be any theme colour: a tone of another colour, a surface, white or black', () => {
    const t = defaultTheme()
    t.buttons.styles[0].light.hover = { fill: 'error:600', text: 'surface:dialog', border: 'white' }
    const o = JSON.parse(JSON.stringify(themeOptions(t, 'light')))
    const h = o.components.MuiButton.variants[0].style['&:hover']
    expect(h.backgroundColor).toBe(t.colors.find((c) => c.id === 'error')!.tones!['600'])
    expect(h.color).toBe('#ffffff')
    expect(h.borderColor).toBe('#ffffff')
  })
})

describe('upgrading the previous version', () => {
  it('turns the older button variants into named styles and gives surfaces roles', () => {
    const d = defaultTheme()
    const st = d.buttons.styles
    const prev = {
      ...d,
      buttons: { pad: d.buttons.pad, variants: { contained: { id: 'contained', name: 'Filled', radius: 'card', textStyle: 'button', shadow: 'md', states: st[0].light }, outlined: { id: 'outlined', name: 'Outline', radius: 'control', textStyle: 'button', shadow: 'none', states: st[2].light }, text: { id: 'text', name: 'Text', radius: 'control', textStyle: 'button', shadow: 'none', states: st[3].light } } },
      colors: d.colors.filter((c) => !c.role?.startsWith('alert')).map((c) => (c.group === 'surface' ? { ...c, role: c.id === 'surface' ? 'Card' : c.id === 'background' ? 'Page background' : undefined } : c)),
    } as unknown as Theme
    const up = upgradeTheme(prev)
    expect(up.buttons.styles.map((x) => x.id)).toEqual(['primary', 'secondary', 'outline', 'text'])
    expect(up.buttons.styles[0].radius).toBe('card')
    expect(up.buttons.styles[1].colorId).toBe('secondary')
    expect(up.colors.find((c) => c.id === 'surface')!.role).toBe('card')
    expect(up.colors.find((c) => c.id === 'background')!.role).toBe('page')
    expect(up.colors.some((c) => c.id === 'alertError')).toBe(true)
  })
})

describe('theme options', () => {
  it('turns button states into real hover, pressed, focus and disabled rules, JSON-safe', () => {
    const o = JSON.parse(JSON.stringify(themeOptions(defaultTheme(), 'light')))
    const v = o.components.MuiButton.variants.find((x: { props: { variant: string } }) => x.props.variant === 'primary')
    expect(Object.keys(v.style)).toEqual(expect.arrayContaining(['&:hover', '&:active', '&.Mui-focusVisible', '&.Mui-disabled']))
    expect(o.components.MuiButton.variants.map((x: { props: { variant: string } }) => x.props.variant)).toEqual(['primary', 'secondary', 'outline', 'text'])
  })
  it('dark mode resolves button colours from the dark tones', () => {
    const l = themeOptions(defaultTheme(), 'light') as never as { palette: { primary: { main: string } } }
    const d = themeOptions(defaultTheme(), 'dark') as never as { palette: { primary: { main: string } } }
    expect(l.palette.primary.main).not.toBe(d.palette.primary.main)
  })
  it('tracks changes from the default', () => {
    const t = defaultTheme()
    expect(changedIds(t).size).toBe(0)
    t.radius = t.radius.map((r) => (r.id === 'control' ? { ...r, value: rem(1) } : r))
    expect([...changedIds(t)]).toEqual(['radius:control'])
  })
})
