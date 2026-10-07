import { expect, mock, test } from 'claude-code/testing'

import { countdown, levelColor, statusText } from '../hooks/register'

const BAND = {
  plugin: 'usage-bar',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('countdown formats days, hours and minutes', async () => {
  const now = Date.parse('2026-10-07T00:00:00Z')
  expect(countdown('2026-10-09T03:30:00Z', now)).toBe('2d 3h')
  expect(countdown('2026-10-07T02:13:00Z', now)).toBe('2h 13m')
  expect(countdown('2026-10-07T00:05:00Z', now)).toBe('5m')
  expect(countdown('2026-10-06T00:00:00Z', now)).toBe('')
  expect(countdown(undefined, now)).toBe('')
})

test('color follows the 70 / 90 thresholds', async () => {
  expect(levelColor(10)).toBe('success')
  expect(levelColor(70)).toBe('warning')
  expect(levelColor(95)).toBe('error')
})

test('band shows 5h, 7d and context after a measurement', async ($, on) => {
  mock.clock(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({
    context: { window: 1_000_000, tokens: 80_000, percent: 8 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 42.4, resetsAt: '2099-01-01T00:00:00Z' },
      { kind: 'seven_day', percentUsed: 91 },
    ],
    changed: ['context', 'rateLimits'],
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: / 42%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: / 91%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: / 8%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /↻/ })).toBeDefined()
    await ui.unmount()
  }
})

test('status text carries all three meters', async () => {
  const now = Date.parse('2026-10-07T00:00:00Z')
  const text = statusText(
    { fiveHour: { percent: 50, resetsAt: '2026-10-07T01:00:00Z' }, sevenDay: null, context: 8 },
    now,
  )
  expect(text).toBe('5h ███░░░ 50% ↻1h 0m  │  7d ░░░░░░ --  │  ctx ░░░░░░ 8%')
})
