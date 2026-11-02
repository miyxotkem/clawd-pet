export type Mood = 'idle' | 'working'
export type Say = { id: number; text: string; kind: 'info' | 'done' | 'error' }
// offset: rows the region reaches above the crab's strip (over the other bars) while it is lifted.
// costume: what it wears; isAutoCostume: chosen from Claude's work rather than by /clawd cosplay;
// restCostume: the current model's suit, worn between jobs while costumes follow Claude's work.
export type PetProps = {
  mood: Mood
  say: Say | null
  columns: number
  rows: number
  offset: number
  costume: string | null
  isAutoCostume: boolean
  restCostume: string | null
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
    }
  }
}
