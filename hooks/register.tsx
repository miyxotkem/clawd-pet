import { atom, read, update } from 'claude-code'
import type { Register, StateDollar } from 'claude-code'

import type { Say } from '../types'

// Rows the bar above the prompt takes: the 4-row crab plus two for hats, stars and z's.
const ROWS = 6
// How many rows the crab may always rise over the bars above; taller bars, as the probe measures them, let it rise further.
const LIFT = 6

const mood = atom({ plugin: 'clawd-pet', key: 'mood' } as const, 'idle')
const said = atom({ plugin: 'clawd-pet', key: 'said' } as const, null)
const isHidden = atom({ plugin: 'clawd-pet', key: 'isHidden' } as const, false)
const isLifted = atom({ plugin: 'clawd-pet', key: 'isLifted' } as const, false)
const cosplay = atom({ plugin: 'clawd-pet', key: 'cosplay' } as const, 'auto')
const activity = atom({ plugin: 'clawd-pet', key: 'activity' } as const, null)
const suit = atom({ plugin: 'clawd-pet', key: 'suit' } as const, null)
const helpers = atom({ plugin: 'clawd-pet', key: 'helpers' } as const, 0)
const typed = atom({ plugin: 'clawd-pet', key: 'typed' } as const, 0)
const effort = atom({ plugin: 'clawd-pet', key: 'effort' } as const, null)
const hero = atom({ plugin: 'clawd-pet', key: 'hero' } as const, false)
const barRows = atom({ plugin: 'clawd-pet', key: 'barRows' } as const, 0)

// Ultracode's switch in /effort, as its output reports it: "Ultracode on", "· Ultracode off".
const ULTRACODE = /\bultracode\W+(on|off)\b/i

// /effort's output when it sets a level: "Set effort level to Max: …".
const EFFORT_SET = /\bset effort level to (extra high|x-?high|low|medium|high|max)\b/i

// A setting as it stands (`ultracode`, `effortLevel`), or undefined when nothing set it.
async function readSetting($: StateDollar, key: string): Promise<unknown> {
  return $.settings.read({ key }).catch(() => undefined)
}

// An effort level as /effort or the settings spell it, or null for anything that is not one.
function levelOf(value: unknown): string | null {
  const level = typeof value === 'string' ? value.toLowerCase().replace(/^(extra high|x-high)$/, 'xhigh') : ''
  return EFFORTS.includes(level) ? level : null
}

// Clawd learns the effort level, and says so, with a jump going up, when it changed.
async function noteEffort($: StateDollar, level: string | null) {
  const was = await read($, effort)
  await update($, effort, () => level)
  if (was && level && was !== level) await say($, effortLine(was, level), EFFORTS.indexOf(level) > EFFORTS.indexOf(was) ? 'done' : 'info')
}

// Effort levels, lowest first: how hard Claude is asked to think.
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
// What Clawd says when the level changes between turns.
function effortLine(from: string, to: string): string {
  if (EFFORTS.indexOf(to) < EFFORTS.indexOf(from)) return to === 'low' ? 'Low effort. Phew, a quick one.' : `Easing off to ${to} effort.`
  if (to === 'max') return 'Max effort! Sleeves rolled up.'
  return `Effort up to ${to}. Let me really think.`
}

// Keep in step with COSTUMES in clawd.tsx.
const COSTUME_NAMES = [
  'detective', 'chef', 'coder', 'dj', 'wizard', 'reader', 'thinker', 'rocket', 'parachute',
  'spidercrab', 'batcrab', 'captain', 'party', 'cheer', 'question', 'bell', 'sign', 'santa', 'pumpkin', 'tet',
]

// Waiting on you: one of these each time, and a word to get your attention.
const WAITING = ['question', 'bell', 'sign']
const WAIT_LINES = ['Your turn!', 'Need your OK!', 'Psst, over here!', 'Waiting on you…']
// Tools that put a question to you: their call lasts until you answer.
const ASKS_YOU = ['AskUserQuestion', 'ExitPlanMode']

// Tết (lunar new year) by year, as [month (0-based), day].
// shortcut: a fixed table, add years past 2030 when it runs out.
const TET: Record<number, [number, number]> = { 2026: [1, 17], 2027: [1, 6], 2028: [0, 26], 2029: [1, 13], 2030: [1, 3] }
const DAY = 86_400_000

// The holiday outfit for a date, if any: worn between jobs in place of the model's suit.
function seasonFor(now: number): string | null {
  const d = new Date(now)
  const tet = TET[d.getFullYear()]
  if (tet && Math.abs(now - new Date(d.getFullYear(), tet[0], tet[1]).getTime()) <= 7 * DAY) return 'tet'
  if (d.getMonth() === 11 && d.getDate() <= 26) return 'santa'
  if (d.getMonth() === 9 && d.getDate() >= 24) return 'pumpkin'
  return null
}

// Commands worth a costume and a word before and after: commits, pushes, test runs.
const MOMENTS: { match: RegExp; costume: string; start: string; ok: string; fail: string }[] = [
  { match: /\bgit\s+commit\b/, costume: 'party', start: 'Committing…', ok: 'Committed! Party time!', fail: "The commit didn't take." },
  { match: /\bgit\s+push\b/, costume: 'rocket', start: 'Pushing…', ok: 'Pushed! Liftoff!', fail: 'The push bounced back.' },
  {
    match: /\b(pytest|jest|vitest|mocha|rspec|phpunit)\b|\b(npm|pnpm|yarn|bun|deno|go|cargo|dotnet|mix|plugin)\s+(run\s+)?test\b/,
    costume: 'cheer',
    start: 'Go tests go!',
    ok: 'Tests passed!',
    fail: 'Tests failed…',
  },
]
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

// Clawd waits with you, once per wait: a question and its permission ask are one wait.
async function waitOnYou($: StateDollar) {
  if (WAITING.includes((await read($, activity)) ?? '')) return
  await update($, activity, () => pick(WAITING))
  await say($, pick(WAIT_LINES))
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
    // The desktop app's effort menu sets the level and flips ultracode as session settings, with no command and
    // no row in the conversation, and nothing announces it: watch the settings, and react as they change.
    // A session starts as the hero if ultracode is on, and knows its level before the first prompt.
    let ultracode = await readSetting($, 'ultracode')
    let level = await readSetting($, 'effortLevel')
    await update($, hero, () => ultracode === true)
    if (levelOf(level)) await update($, effort, () => levelOf(level))
    $.clock.every(1000, async () => {
      // Only a change counts: /effort in the terminal may switch either without touching the settings.
      const ultracodeNow = await readSetting($, 'ultracode')
      if (ultracodeNow !== ultracode) {
        ultracode = ultracodeNow
        await update($, hero, () => ultracodeNow === true)
      }
      const levelNow = await readSetting($, 'effortLevel')
      if (levelNow !== level) {
        level = levelNow
        if (levelOf(levelNow)) await noteEffort($, levelOf(levelNow))
      }
    })

    return next(e)
  })

  // Ultracode is a switch in /effort (Tab in its slider, or /effort ultracode on|off). No event says it flipped, but
  // the conversation shows it: /effort's output row reads "Ultracode on" or "off" once its panel closes, and the next
  // prompt carries Claude Code's own ultra_effort_enter or ultra_effort_exit note, however the switch was flipped.
  on('session.append', async ($, e, next) => {
    if (e.agentId === undefined) {
      try {
        // Only command output: a prompt or a reply that merely mentions ultracode is not the switch. A plugin's
        // command answers as a system notice; a built-in's comes as a user row wrapped in <local-command-stdout>.
        const all = e.message.content.map(b => ('text' in b && typeof b.text === 'string' ? b.text : '')).join(' ')
        const isOutput = e.message.type === 'system' || e.door === 'command' || e.door === 'notice' || all.includes('<local-command-stdout>')
        const text = isOutput ? all : ''
        const name = e.message.name
        const flipped = name === 'ultra_effort_enter' ? 'on' : name === 'ultra_effort_exit' ? 'off' : ULTRACODE.exec(text)?.[1]?.toLowerCase()
        if (flipped) await update($, hero, () => flipped === 'on')
        // /effort set a level: Clawd says so as the panel closes, not at the next prompt.
        const set = levelOf(EFFORT_SET.exec(text)?.[1])
        if (set) await noteEffort($, set)
      } catch {
        // Clawd's bookkeeping never holds up the conversation.
      }
    }

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

  // Clawd types along with you: count each real edit (not a bare cursor move) and leave the draft alone.
  on('prompt.edit', async ($, e, next) => {
    if (e.inputText || e.start !== e.end) await update($, typed, n => n + 1)

    return next(e)
  }).catch(($, e, next) => next(e))

  // The effort level also rides on each model request: a turn's first catches any switch the settings and
  // /effort's output did not show. turn.step streams, so the hook is a generator that passes the stream through.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined && e.index === 0) {
      try {
        await noteEffort($, levelOf(e.effort))
      } catch {
        // Clawd's own bookkeeping never holds up the model's request.
      }
    }

    return yield* next(e)
  })

  on('tool.call', async ($, e, next) => {
    const command = (e.tool === 'Bash' || e.tool === 'PowerShell') && typeof e.command === 'string' ? e.command : ''
    const moment = MOMENTS.find(m => m.match.test(command))
    const line = moment?.start ?? TOOL_LINES[e.tool]
    await update($, activity, () => moment?.costume ?? TOOL_COSTUMES[e.tool] ?? 'coder')
    const now = await $.clock.now()
    // Talk only when the kind of work changes, and not more than every 6s; moments always talk.
    if (line && (moment || (e.tool !== lastTool && now - lastToolAt > 6000))) {
      lastTool = e.tool
      lastToolAt = now
      await say($, line)
    }
    const asksYou = ASKS_YOU.includes(e.tool)
    if (e.tool !== 'Agent' && !moment && !asksYou) return next(e)

    // A helper crab walks beside Clawd while each subagent runs.
    if (e.tool === 'Agent') await update($, helpers, n => n + 1)
    if (asksYou) await waitOnYou($)
    try {
      const result = await next(e)
      if (moment && !result.deny) await say($, result.isError ? moment.fail : moment.ok, result.isError ? 'error' : 'done')

      return result
    } finally {
      if (e.tool === 'Agent') await update($, helpers, n => Math.max(0, n - 1))
      // Answered: back to thinking it over with Claude.
      if (asksYou) await update($, activity, () => 'thinker')
    }
  }).catch(($, e, next) => next(e))

  // A permission prompt is about to ask you: Clawd waits with you.
  // shortcut: no event says when you answer, so the costume stays on while an approved tool runs, until the next tool
  // or the turn's end; upgrade if the API gains one.
  on('classic.PermissionRequest', async ($, e, next) => {
    await waitOnYou($)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    // A subagent's run ending is not the turn ending: the main turn may still be working.
    if (e.agentId !== undefined) return next(e)
    lastTool = ''
    await update($, helpers, () => 0)
    await update($, mood, () => 'idle')
    await update($, activity, () => (e.reason === 'answer' ? 'rocket' : null))
    if (e.reason === 'answer') await say($, pick(['Done! ✓', 'All finished!', 'Ta-da!']), 'done')
    else if (e.reason === 'aborted') await say($, 'Okay, stopping.')
    else await say($, 'Hmm, that went wrong.', 'error')

    return next(e)
  }).catch(($, e, next) => next(e))

  // The crab asks for the room above while held or falling and gives it back once landed, and says when a demo ends.
  on('ui.message', async ($, e) => {
    const data = e.data as { lifted?: unknown; isDemoDone?: unknown; barRows?: unknown } | null
    if (typeof data?.lifted === 'boolean') await update($, isLifted, () => data.lifted === true)
    // The probe behind the other bars measured them.
    if (typeof data?.barRows === 'number' && data.barRows >= 0) await update($, barRows, () => Math.floor(data.barRows as number))
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
    // Lifted, the crab may rise LIFT rows, or as high as the bars above reach when they are taller; never past the band's top.
    const reach = Math.max(await read($, barRows), LIFT)
    const offset = (await read($, isLifted)) ? Math.max(0, Math.min(reach, e.props.maxRows - ROWS)) : 0
    // Draw the other bars first and sit below them, rather than replacing them.
    const others = await next(e)

    return (
      <Box flexDirection="column">
        {/* The probe sits behind the other bars at their height and reports it. */}
        <Box flexDirection="column">
          <Box position="absolute" top={0} left={0} width={1} height="100%">
            <Client key="probe" module="./probe.tsx" width={1} height="100%" />
          </Box>
          {others}
        </Box>
        {/* The crab keeps its own rows; lifted, its region grows up over the bars, which only it then covers. */}
        <Box width={columns} height={rows}>
          <Box position="absolute" top={-offset} left={0}>
            <Client
              key="clawd"
              module="./clawd.tsx"
              width={columns}
              height={rows + offset}
              // The desktop app sizes a Client from what it draws, so the module needs the size up front.
              props={{
                mood: await read($, mood),
                say: await read($, said),
                columns,
                rows,
                offset,
                costume,
                isAutoCostume,
                restCostume: seasonFor(await $.clock.now()) ?? (await read($, suit)),
                helpers: await read($, helpers),
                typed: await read($, typed),
                effort: await read($, effort),
                hero: await read($, hero),
              }}
            />
          </Box>
        </Box>
      </Box>
    )
  })
}
