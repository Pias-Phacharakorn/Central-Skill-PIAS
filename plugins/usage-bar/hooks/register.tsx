import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Meter, Usage } from '../types'

// Below this many columns the bars shrink to 5 cells so the line still fits.
const NARROW = 130

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
  percent >= 80 ? '🟥' : percent >= 50 ? '🟨' : '🟩'

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
export const textBar = (percent: number | null, cells = 10) => {
  if (percent === null) return `${'⬛'.repeat(cells)} --`
  const pct = Math.min(100, Math.max(0, Math.round(percent)))
  const filled = Math.ceil((pct * cells) / 100)
  return `${levelCell(pct).repeat(filled)}${'⬛'.repeat(cells - filled)} ${pct}%`
}

export const cellsFor = (columns: number | undefined) =>
  columns !== undefined && columns < NARROW ? 5 : 10

export const statusText = (u: Usage, nowMs: number, cells = 10) => {
  const part = (label: string, m: Meter | null) => {
    const reset = countdown(m?.resetsAt, nowMs)
    return `${label} ${textBar(m?.percent ?? null, cells)}${reset ? ` ↻${reset}` : ''}`
  }
  return [part('5h', u.fiveHour), part('7d', u.sevenDay), `ctx ${textBar(u.context, cells)}`].join('  │  ')
}

let latest: Usage | null = null
let cells = 10

async function show($: EngineInterface) {
  if (latest) $.ui.status(statusText(latest, await $.clock.now(), cells))
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

  // The status line has no width of its own; the prompt hint redraws on every
  // resize, so it tells us when to switch between 5 and 10 cells.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const wanted = cellsFor(e.viewport?.columns)
    if (wanted !== cells) {
      cells = wanted
      await show($)
    }
    return next(e)
  })
}
