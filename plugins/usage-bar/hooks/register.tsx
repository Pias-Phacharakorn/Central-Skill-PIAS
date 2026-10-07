import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Meter, Usage } from '../types'

const usage = atom({ plugin: 'usage-bar', key: 'usage' } as const, null)
// Bumped every minute so the reset countdowns redraw between turns.
const now = atom({ plugin: 'usage-bar', key: 'now' } as const, 0)

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
  percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success'

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

const textBar = (percent: number | null) => {
  if (percent === null) return '░░░░░░ --'
  const pct = Math.min(100, Math.max(0, Math.round(percent)))
  const filled = Math.round((pct * 6) / 100)
  return `${'█'.repeat(filled)}${'░'.repeat(6 - filled)} ${pct}%`
}

// Plain-text copy for surfaces that draw the status line but not the band.
export const statusText = (u: Usage, nowMs: number) => {
  const part = (label: string, m: Meter | null) => {
    const reset = countdown(m?.resetsAt, nowMs)
    return `${label} ${textBar(m?.percent ?? null)}${reset ? ` ↻${reset}` : ''}`
  }
  return [part('5h', u.fiveHour), part('7d', u.sevenDay), `ctx ${textBar(u.context)}`].join('  │  ')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const { rateLimits, context } = await $.session.usage()
    const first = toUsage(rateLimits, context)
    await update($, usage, () => first)
    $.ui.status(statusText(first, await $.clock.now()))
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
    $.ui.status(statusText(latest, await $.clock.now()))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, usage)
    if (e.props.hasSurvey || current === null) return next(e)

    const nowMs = (await read($, now)) || (await $.clock.now())
    const { Box, Text } = $.ui.resolve(e)
    const width = e.props.bodyColumns < 90 ? 6 : 12

    const meter = (label: string, percent: number | null, resetsAt?: string) => {
      const pct = percent === null ? null : Math.min(100, Math.max(0, Math.round(percent)))
      const filled = pct === null ? 0 : Math.round((pct * width) / 100)
      const reset = countdown(resetsAt, nowMs)
      return (
        <Box flexDirection="row" key={label}>
          <Text bold>{label} </Text>
          <Text color={pct === null ? 'subtle' : levelColor(pct)}>{'━'.repeat(filled)}</Text>
          <Text color="subtle">{'─'.repeat(width - filled)}</Text>
          <Text color={pct === null ? 'subtle' : levelColor(pct)}> {pct === null ? '--' : `${pct}%`}</Text>
          {reset ? <Text dimColor> ↻ {reset}</Text> : null}
        </Box>
      )
    }

    const sep = (key: string) => (
      <Text color="subtle" key={key}>
        {'  │  '}
      </Text>
    )

    return (
      <Box flexDirection="row">
        {meter('5h', current.fiveHour?.percent ?? null, current.fiveHour?.resetsAt)}
        {sep('s1')}
        {meter('7d', current.sevenDay?.percent ?? null, current.sevenDay?.resetsAt)}
        {sep('s2')}
        {meter('ctx', current.context)}
      </Box>
    )
  })
}
