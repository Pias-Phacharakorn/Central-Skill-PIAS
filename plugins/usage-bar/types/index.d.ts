export type Meter = { percent: number; resetsAt?: string }

export type Usage = {
  fiveHour: Meter | null
  sevenDay: Meter | null
  context: number | null
}
