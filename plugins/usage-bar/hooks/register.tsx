import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Meter, Usage } from '../types'

const CELLS = 5

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

// The status line is plain text, so the bar's colour comes from coloured squares.
export const levelCell = (percent: number) =>
  percent >= 90 ? '🟥' : percent >= 70 ? '🟨' : '🟩'

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

// Any usage above zero lights at least one cell.
export const textBar = (percent: number | null) => {
  if (percent === null) return `${'⬛'.repeat(CELLS)} --`
  const pct = Math.min(100, Math.max(0, Math.round(percent)))
  const filled = Math.ceil((pct * CELLS) / 100)
  return `${levelCell(pct).repeat(filled)}${'⬛'.repeat(CELLS - filled)} ${pct}%`
}

export const statusText = (u: Usage, nowMs: number) => {
  const part = (label: string, m: Meter | null) => {
    const reset = countdown(m?.resetsAt, nowMs)
    return `${label} ${textBar(m?.percent ?? null)}${reset ? ` ↻${reset}` : ''}`
  }
  return [part('5h', u.fiveHour), part('7d', u.sevenDay), `ctx ${textBar(u.context)}`].join('  │  ')
}

let latest: Usage | null = null

async function show($: EngineInterface) {
  if (latest) $.ui.status(statusText(latest, await $.clock.now()))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const { rateLimits, context } = await $.session.usage()
    latest = toUsage(rateLimits, context)
    await show($)
    // Redraw every minute so the reset countdowns stay current between turns.
    $.clock.every(60_000, () => show($))
    return result
  })

  on('session.measure', async ($, e, next) => {
    latest = toUsage(e.rateLimits, e.context)
    await show($)
    return next(e)
  })
}
