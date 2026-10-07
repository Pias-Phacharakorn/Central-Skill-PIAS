export type Meter = { percent: number; resetsAt?: string }

export type Usage = {
  fiveHour: Meter | null
  sevenDay: Meter | null
  context: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'usage-bar': { usage: Usage | null; now: number }
  }
}
