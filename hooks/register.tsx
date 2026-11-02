import { atom, read, update } from 'claude-code'
import type { Register, StateDollar } from 'claude-code'

import type { Say } from '../types'

// Rows the bar above the prompt takes: the 4-row crab plus two for hats, stars and z's.
const ROWS = 6
// How many rows the crab may rise over the bars above: the most it can fall from.
const LIFT = 6

const mood = atom({ plugin: 'clawd-pet', key: 'mood' } as const, 'idle')
const said = atom({ plugin: 'clawd-pet', key: 'said' } as const, null)
const isHidden = atom({ plugin: 'clawd-pet', key: 'isHidden' } as const, false)
const isLifted = atom({ plugin: 'clawd-pet', key: 'isLifted' } as const, false)
const cosplay = atom({ plugin: 'clawd-pet', key: 'cosplay' } as const, 'auto')
const activity = atom({ plugin: 'clawd-pet', key: 'activity' } as const, null)
const suit = atom({ plugin: 'clawd-pet', key: 'suit' } as const, null)

// Keep in step with COSTUMES in clawd.tsx.
const COSTUME_NAMES = ['detective', 'chef', 'coder', 'dj', 'wizard', 'reader', 'thinker', 'rocket', 'parachute', 'spidercrab', 'batcrab', 'captain']
// The suit each model wears, matched on its id (claude-opus-5-5, maybe with a suffix), its name as
// /model shows it (Opus 5.5), or a bare alias (opus), which points at the newest of the family: 5.5.
const MODEL_SUITS: { match: RegExp; suit: string; line: string }[] = [
  { match: /opus[- ]5[-.]5|^opus$/i, suit: 'spidercrab', line: 'Opus 5.5 is here. Crab senses: tingling!' },
  { match: /haiku[- ]5[-.]5|^haiku$/i, suit: 'batcrab', line: 'Haiku 5.5 on patrol. Fast and quiet.' },
  { match: /sonnet[- ]5[-.]5|^sonnet$/i, suit: 'captain', line: 'Sonnet 5.5, reporting for duty!' },
]

// Puts on the suit for `model` (or takes one off); says so only when asked to.
async function wearSuitFor($: StateDollar, model: string, announce: boolean) {
  const hero = MODEL_SUITS.find(m => m.match.test(model.trim()))
  const was = await read($, suit)
  await update($, suit, () => hero?.suit ?? null)
  if (!announce) return
  await update($, activity, () => null)
  if (hero) await say($, hero.line, 'done')
  else if (was) await say($, 'Suit off. Back to plain Clawd.')
}
// What Clawd wears for each tool while cosplay follows Claude's work.
const TOOL_COSTUMES: Record<string, string> = {
  Read: 'reader',
  Edit: 'chef',
  Write: 'chef',
  NotebookEdit: 'chef',
  Bash: 'wizard',
  PowerShell: 'wizard',
  Grep: 'detective',
  Glob: 'detective',
  WebFetch: 'detective',
  WebSearch: 'detective',
}

const TOOL_LINES: Record<string, string> = {
  Read: 'Reading files…',
  Edit: 'Editing code…',
  Write: 'Writing a file…',
  NotebookEdit: 'Editing a notebook…',
  Bash: 'Running a command…',
  PowerShell: 'Running a command…',
  Grep: 'Searching…',
  Glob: 'Looking for files…',
  WebFetch: 'Reading the web…',
  WebSearch: 'Searching the web…',
  Agent: 'Calling in a helper…',
}

const START_LINES = ['On it!', 'Claws ready!', 'Let me think…', 'Ooh, a task!']
const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)] ?? ''

function say($: StateDollar, text: string, kind: Say['kind'] = 'info') {
  return update($, said, prev => ({ id: (prev?.id ?? 0) + 1, text, kind }))
}

export const register: Register = on => {
  let lastTool = ''
  let lastToolAt = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'clawd',
      description: 'Show the Clawd pet; /clawd hide, /clawd cosplay <costume|auto|off>, /clawd <text> to make it talk',
    })
    // Clawd lived in a pane before it moved to the bar: close one left open.
    await update($, isLifted, () => false)
    void $.ui.close({ id: 'clawd' })
    // Dress for the model the chat starts on (this runs again on each reload of the mod).
    const model = await $.session.model().catch(() => '')
    if (model) await wearSuitFor($, model, false)

    return next(e)
  })

  on('command.run', { command: 'clawd' }, async ($, e) => {
    const text = e.args.trim()
    if (text === 'hide') {
      await update($, isHidden, () => true)

      return { text: 'Clawd is napping off-screen. /clawd brings it back.' }
    }
    const [word, choice = ''] = text.split(/\s+/)
    if (word === 'cosplay') {
      if (!['auto', 'off', 'demo'].includes(choice) && !COSTUME_NAMES.includes(choice)) {
        return {
          text: `Costumes: ${COSTUME_NAMES.join(', ')}. Or auto (follows Claude's work), off, or demo (shows them all). Now: ${await read($, cosplay)}.`,
        }
      }
      await update($, isHidden, () => false)
      await update($, cosplay, () => choice)
      if (COSTUME_NAMES.includes(choice)) await say($, `Ta-da! I'm a ${choice}!`)
      if (choice === 'demo') return { text: `Clawd shows off all ${COSTUME_NAMES.length} costumes, about 3 seconds each.` }

      return { text: choice === 'auto' ? "Clawd dresses for Claude's work again." : `Clawd cosplay: ${choice}.` }
    }
    await update($, isHidden, () => false)
    if (text) await say($, text)

    return { text: 'Clawd is here!' }
  })

  on('classic.PostModelSwitch', async ($, e, next) => {
    await wearSuitFor($, e.to_model, true)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    await update($, mood, () => 'working')
    await update($, activity, () => 'thinker')
    await say($, pick(START_LINES))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const line = TOOL_LINES[e.tool]
    await update($, activity, () => TOOL_COSTUMES[e.tool] ?? 'coder')
    const now = await $.clock.now()
    // Talk only when the kind of work changes, and not more than every 6s.
    if (line && e.tool !== lastTool && now - lastToolAt > 6000) {
      lastTool = e.tool
      lastToolAt = now
      await say($, line)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    lastTool = ''
    await update($, mood, () => 'idle')
    await update($, activity, () => (e.reason === 'answer' ? 'rocket' : null))
    if (e.reason === 'answer') await say($, pick(['Done! ✓', 'All finished!', 'Ta-da!']), 'done')
    else if (e.reason === 'aborted') await say($, 'Okay, stopping.')
    else await say($, 'Hmm, that went wrong.', 'error')

    return next(e)
  }).catch(($, e, next) => next(e))

  // The crab asks for the room above while held or falling and gives it back once landed, and says when a demo ends.
  on('ui.message', async ($, e) => {
    const data = e.data as { lifted?: unknown; isDemoDone?: unknown } | null
    if (typeof data?.lifted === 'boolean') await update($, isLifted, () => data.lifted === true)
    // The demo has shown every costume: back to dressing for Claude's work.
    if (data?.isDemoDone === true) await update($, cosplay, c => (c === 'demo' ? 'auto' : c))

    return {}
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.props.maxRows < ROWS || (await read($, isHidden))) return next(e)
    // Only the terminal and the desktop app draw a Client.
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Client } = $.ui.resolve({ ...e, surface: e.surface })
    const columns = e.props.bodyColumns
    const rows = ROWS
    const chosen = await read($, cosplay)
    const isAutoCostume = chosen === 'auto'
    const costume = isAutoCostume ? await read($, activity) : chosen === 'off' ? null : chosen
    const offset = (await read($, isLifted)) ? Math.max(0, Math.min(LIFT, e.props.maxRows - ROWS)) : 0
    // Draw the other bars first and sit below them, rather than replacing them.
    const others = await next(e)

    return (
      <Box flexDirection="column">
        {others}
        {/* The crab keeps its own rows; lifted, its region grows up over the bars, which only it then covers. */}
        <Box width={columns} height={rows}>
          <Box position="absolute" top={-offset} left={0}>
            <Client
              key="clawd"
              module="./clawd.tsx"
              width={columns}
              height={rows + offset}
              // The desktop app sizes a Client from what it draws, so the module needs the size up front.
              props={{ mood: await read($, mood), say: await read($, said), columns, rows, offset, costume, isAutoCostume, restCostume: await read($, suit) }}
            />
          </Box>
        </Box>
      </Box>
    )
  })
}
