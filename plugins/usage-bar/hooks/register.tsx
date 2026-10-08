import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Meter, Usage } from '../types'

const usage = atom({ plugin: 'usage-bar', key: 'usage' } as const, null)
// Bumped every minute so the reset countdowns redraw between turns.
const now = atom({ plugin: 'usage-bar', key: 'now' } as const, 0)

const CELLS = 6

const toMeter = (limits: SessionRateLimit[], kind: string): Meter | null => {
  const limit = limits.find(l => l.kind === kind)
  return limit ? { percent: limit.percentUsed, resetsAt: limit.resetsAt } : null
}

export const toUsage = (
  limits: SessionRateLimit[],
  context: SessionContextUsage,
): Usage => ({
  fiveHour: toMeter(limits, 'five_hour'),
  sevenDay: toMeter(limits, 'seven_day'),
  context: context.percent ?? null,
})

export const levelColor = (percent: number) =>
  percent >= 80 ? 'error' : percent >= 50 ? 'warning' : 'success'

export const countdown = (resetsAt: string | undefined, nowMs: number) => {
  if (!resetsAt) return ''
  const minutes = Math.floor((Date.parse(resetsAt) - nowMs) / 60000)
  if (!(minutes > 0)) return ''
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export const barParts = (percent: number | null) => {
  if (percent === null) return { pct: null, filled: '', empty: '░'.repeat(CELLS) }
  const pct = Math.min(100, Math.max(0, Math.round(percent)))
  const n = Math.round((pct * CELLS) / 100)
  return { pct, filled: '█'.repeat(n), empty: '░'.repeat(CELLS - n) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const { rateLimits, context } = await $.session.usage()
    const first = toUsage(rateLimits, context)
    await update($, usage, () => first)
    const tick = async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
    }
    await tick()
    $.clock.every(60_000, tick)
    return result
  })

  on('session.measure', async ($, e, next) => {
    const latest = toUsage(e.rateLimits, e.context)
    await update($, usage, () => latest)
    return next(e)
  })

  // Drawn on the hint line under the prompt rather than through $.ui.status:
  // the status line is plain text and carries the plugin's name in front.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const current = await read($, usage)
    if (current === null) return next(e)

    const nowMs = (await read($, now)) || (await $.clock.now())
    const { Box, Text } = $.ui.resolve(e)

    const meter = (label: string, percent: number | null, resetsAt?: string) => {
      const { pct, filled, empty } = barParts(percent)
      const reset = countdown(resetsAt, nowMs)
      return (
        <Box flexDirection="row" key={label}>
          <Text dimColor>{label} </Text>
          {pct === null ? null : <Text color={levelColor(pct)}>{filled}</Text>}
          <Text dimColor>{empty}</Text>
          <Text color={pct === null ? undefined : levelColor(pct)} dimColor={pct === null}>
            {' '}
            {pct === null ? '--' : `${pct}%`}
          </Text>
          {reset ? <Text dimColor> ↻{reset}</Text> : null}
        </Box>
      )
    }

    const sep = (key: string) => (
      <Text dimColor key={key}>
        {'  │  '}
      </Text>
    )

    return (
      <Box flexDirection="row">
        {e.props.hint ? <Text dimColor>{e.props.hint}{'  │  '}</Text> : null}
        {meter('5h', current.fiveHour?.percent ?? null, current.fiveHour?.resetsAt)}
        {sep('s1')}
        {meter('7d', current.sevenDay?.percent ?? null, current.sevenDay?.resetsAt)}
        {sep('s2')}
        {meter('ctx', current.context)}
      </Box>
    )
  })
}
