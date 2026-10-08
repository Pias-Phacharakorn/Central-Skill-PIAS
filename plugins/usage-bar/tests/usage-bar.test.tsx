import { expect, mock, test } from 'claude-code/testing'

import { countdown, levelCell, statusText, textBar } from '../hooks/register'

test('countdown formats days, hours and minutes', async () => {
  const now = Date.parse('2026-10-07T00:00:00Z')
  expect(countdown('2026-10-09T03:30:00Z', now)).toBe('2d 3h')
  expect(countdown('2026-10-07T02:13:00Z', now)).toBe('2h 13m')
  expect(countdown('2026-10-07T00:05:00Z', now)).toBe('5m')
  expect(countdown('2026-10-06T00:00:00Z', now)).toBe('')
  expect(countdown(undefined, now)).toBe('')
})

test('colour follows the 50 / 80 thresholds', async () => {
  expect(levelCell(49)).toBe('🟩')
  expect(levelCell(50)).toBe('🟨')
  expect(levelCell(80)).toBe('🟥')
})

test('bar lights a cell for any usage and colours by level', async () => {
  expect(textBar(0)).toBe('⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ 0%')
  expect(textBar(7)).toBe('🟩⬛⬛⬛⬛⬛⬛⬛⬛⬛ 7%')
  expect(textBar(75)).toBe('🟨🟨🟨🟨🟨🟨🟨🟨⬛⬛ 75%')
  expect(textBar(100)).toBe('🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥 100%')
  expect(textBar(null)).toBe('⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ --')
})

test('status text carries all three meters', async () => {
  const now = Date.parse('2026-10-07T00:00:00Z')
  const text = statusText(
    { fiveHour: { percent: 50, resetsAt: '2026-10-07T01:00:00Z' }, sevenDay: null, context: 8 },
    now,
  )
  expect(text).toBe('5h 🟨🟨🟨🟨🟨⬛⬛⬛⬛⬛ 50% ↻1h 0m  │  7d ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛ --  │  ctx 🟩⬛⬛⬛⬛⬛⬛⬛⬛⬛ 8%')
})

test('a measurement pins the coloured status line', async ($, on) => {
  mock.clock(on)
  const seen: (string | undefined)[] = []
  on('ui.status', (_$, e) => {
    seen.push(e.text)
    return { value: undefined }
  })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({
    context: { window: 1_000_000, tokens: 80_000, percent: 8 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 42.4 },
      { kind: 'seven_day', percentUsed: 91 },
    ],
    changed: ['context', 'rateLimits'],
  })
  const last = seen.at(-1) ?? ''
  expect(last).toContain('5h 🟩🟩🟩🟩🟩⬛⬛⬛⬛⬛ 42%')
  expect(last).toContain('7d 🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥 91%')
  expect(last).toContain('ctx 🟩⬛⬛⬛⬛⬛⬛⬛⬛⬛ 8%')
})
