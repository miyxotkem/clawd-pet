export type Mood = 'idle' | 'working'
export type Say = { id: number; text: string; kind: 'info' | 'done' | 'error' }
// offset: rows the region reaches above the crab's strip (over the other bars) while it is lifted.
// costume: what it wears; isAutoCostume: chosen from Claude's work rather than by /clawd cosplay;
// restCostume: the holiday outfit or else the current model's suit, worn between jobs while costumes follow Claude's work.
// helpers: subagents running now, each drawn as a small crab beside Clawd.
// typed: edits made in the prompt box so far; a change means you just typed.
// effort: the effort level of the latest turn (low to max), null when the model has none.
export type PetProps = {
  mood: Mood
  say: Say | null
  columns: number
  rows: number
  offset: number
  costume: string | null
  isAutoCostume: boolean
  restCostume: string | null
  helpers: number
  typed: number
  effort: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'clawd-pet': {
      mood: Mood
      said: Say | null
      isHidden: boolean
      isLifted: boolean
      // 'auto' follows Claude's work, 'off' wears nothing, 'demo' shows each in turn, else a costume name.
      cosplay: string
      // The costume Claude's current work calls for, worn while cosplay is 'auto'.
      activity: string | null
      // The suit the current model wears: set when /model switches to Opus, Haiku or Sonnet 5.5.
      suit: string | null
      // Subagents running now.
      helpers: number
      // Edits made in the prompt box so far.
      typed: number
      // The effort level of the latest turn: low, medium, high, xhigh or max.
      effort: string | null
    }
  }
}
