import { expect, it } from 'vitest'
import { nodeCss } from './css'
import { effLayout } from '../model/tree'
import type { DesignNode } from '../model/types'

const res = { radius: () => undefined, shadow: () => undefined }
const node = (layout: DesignNode['layout']): DesignNode => ({ id: 'n', type: 'container', layout })

it('tablet and desktop each follow mobile, never each other', () => {
  const n = node({ base: { direction: 'column' }, tablet: { direction: 'row' } })
  expect(effLayout(n, 'mobile').direction).toBe('column')
  expect(effLayout(n, 'tablet').direction).toBe('row')
  expect(effLayout(n, 'desktop').direction).toBe('column')
})

it('a tablet-only change is reset for desktop in the generated rules', () => {
  const css = nodeCss(node({ base: { direction: 'column' }, tablet: { direction: 'row', gap: 2000 } }), undefined, res)
  expect(css['@container (min-width: 48rem)']).toMatchObject({ flexDirection: 'row', columnGap: '1rem', rowGap: '1rem' })
  expect(css['@container (min-width: 80rem)']).toMatchObject({ flexDirection: 'column', columnGap: '0', rowGap: '0' })
})

it('desktop-only change does not touch tablet', () => {
  const css = nodeCss(node({ base: { direction: 'column' }, desktop: { direction: 'row' } }), undefined, res)
  expect(css['@container (min-width: 48rem)']).toBeUndefined()
  expect(css['@container (min-width: 80rem)']).toMatchObject({ flexDirection: 'row' })
})

it('explicit auto size overrides an inherited fill', () => {
  const n: DesignNode = { id: 'c', type: 'container', layout: { base: { width: { mode: 'fill' } }, desktop: { width: { mode: 'auto' } } } }
  const parent = node({ base: { direction: 'column' } })
  const css = nodeCss(n, parent, res)
  expect(css['@container (min-width: 80rem)']).toMatchObject({ alignSelf: 'auto' })
})

it('horizontal and vertical gaps are independent', () => {
  const css = nodeCss(node({ base: { direction: 'row', wrap: true, gapX: 1000, gapY: 4000 } }), undefined, res)
  expect(css).toMatchObject({ flexWrap: 'wrap', columnGap: '0.5rem', rowGap: '2rem' })
})

it('auto on either gap spreads items or wrapped lines', () => {
  const row = nodeCss(node({ base: { direction: 'row', wrap: true, gapX: 'auto', gapY: 'auto' } }), undefined, res)
  expect(row).toMatchObject({ justifyContent: 'space-between', alignContent: 'space-between' })
  const col = nodeCss(node({ base: { direction: 'column', gapY: 'auto' } }), undefined, res)
  expect(col).toMatchObject({ justifyContent: 'space-between' })
  expect(col.alignContent).toBeUndefined()
})
