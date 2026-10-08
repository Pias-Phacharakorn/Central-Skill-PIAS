import { expect, mock, test } from 'claude-code/testing'

import { barParts, countdown, levelColor } from '../hooks/register'

const HINT = {
  plugin: 'usage-bar',
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
} as const

test('countdown formats days, hours and minutes', async () => {
  const now = Date.parse('2026-10-07T00:00:00Z')
  expect(countdown('2026-10-09T03:30:00Z', now)).toBe('2d 3h')
  expect(countdown('2026-10-07T02:13:00Z', now)).toBe('2h 13m')
  expect(countdown('2026-10-07T00:05:00Z', now)).toBe('5m')
  expect(countdown('2026-10-06T00:00:00Z', now)).toBe('')
  expect(countdown(undefined, now)).toBe('')
})

test('colour follows the 50 / 80 thresholds', async () => {
  expect(levelColor(49)).toBe('success')
  expect(levelColor(50)).toBe('warning')
  expect(levelColor(80)).toBe('error')
})

test('bar splits into filled and empty cells', async () => {
  expect(barParts(50)).toEqual({ pct: 50, filled: '███', empty: '░░░' })
  expect(barParts(0)).toEqual({ pct: 0, filled: '', empty: '░░░░░░' })
  expect(barParts(null)).toEqual({ pct: null, filled: '', empty: '░░░░░░' })
})

const measure = async ($: Parameters<Parameters<typeof test>[1]>[0]) =>
  $.session.measure({
    context: { window: 1_000_000, tokens: 80_000, percent: 8 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 42.4, resetsAt: '2099-01-01T00:00:00Z' },
      { kind: 'seven_day', percentUsed: 91 },
    ],
    changed: ['context', 'rateLimits'],
  })

const expectMeters = async (ui: { find: (q: { type: 'Text'; text: RegExp }) => Promise<unknown> }) => {
  expect(await ui.find({ type: 'Text', text: /42%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /91%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /8%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /↻/ })).toBeDefined()
}

test('terminal: meters on the hint line, no status line', async ($, on) => {
  mock.clock(on)
  const statuses: (string | undefined)[] = []
  on('ui.status', (_$, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await measure($)
  expect(statuses).toEqual([])
  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' })
  await expectMeters(ui)
  expect(await ui.find({ type: 'Text', text: /shortcuts/ })).toBeDefined()
  await ui.unmount()
})

test('desktop: meters in the footer mode labels', async ($, on) => {
  mock.clock(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await measure($)
  const ui = await $.ui.mount({
    plugin: 'usage-bar',
    component: 'SessionMode',
    surface: 'desktop',
    props: { modes: ['focus'] },
  })
  await expectMeters(ui)
  expect(await ui.find({ type: 'Text', text: /focus/ })).toBeDefined()
  await ui.unmount()
})
