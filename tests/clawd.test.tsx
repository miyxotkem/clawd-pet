import { expect, mock, test } from 'claude-code/testing'

// Clawd reads the date for its holiday outfits: tests run on a day with none.
const NO_HOLIDAY = new Date(2026, 10, 3).getTime()

const BAR = {
  plugin: 'clawd-pet',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80 },
} as const

test('thrown crab lands stunned, on every surface that draws it', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  // Stands for the engine's own (empty) bar beneath this one.
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAR, surface } as never)
    // No resize: the desktop app sizes a Client from what it draws, so the module must not wait for one.
    await ui.advance(100)

    // It greets by time of day.
    expect(await ui.find({ type: 'Text', text: /morning|afternoon|Evening|midnight/, in: 'clawd' })).toBeDefined()

    // Crab rests at the right side: columns 64..73, rows 2..5 of the 6-row bar. Grab it and fling it left.
    await ui.pointer({ in: 'clawd', type: 'down', x: 68, y: 2, button: 'left' })
    await ui.advance(100)
    await ui.pointer({ in: 'clawd', type: 'move', x: 30, y: 0, button: 'left' })
    await ui.advance(100)
    await ui.pointer({ in: 'clawd', type: 'up', x: 30, y: 0, button: 'left' })

    let stunned
    for (let i = 0; i < 20 && !stunned; i++) {
      await ui.advance(200)
      stunned = await ui.find({ type: 'Text', text: /✦|✧/, in: 'clawd' })
    }
    expect(stunned).toBeDefined()
    await ui.unmount()
  }
})

test('the crab keeps the other bars above the prompt', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  // Stands for the engine and other plugins drawing their own bar beneath this one.
  on('ui.render', { component: 'AbovePrompt' }, () => h('Text', null, 'other bar'))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAR, surface } as never)
    expect(await ui.find({ type: 'Text', text: 'other bar' })).toBeDefined()
    expect(await ui.find({ type: 'Client' })).toBeDefined()
    await ui.unmount()
  }
})

test('hovering readies the room above, so a slow drag lifts the crab over the bars', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Text', null, 'other bar'))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAR, surface } as never)
    await ui.advance(100)

    // Hover the crab's strip: its region grows 6 rows up over the bars before any drag starts.
    await ui.pointer({ in: 'clawd', type: 'move', x: 68, y: 2 })
    await ui.advance(100)
    expect(JSON.stringify(await ui.drawn())).toContain('"height":12')

    // Grab it (strip row 2 is region row 8) and drag slowly up to the top: 6 rows above the strip.
    await ui.pointer({ in: 'clawd', type: 'down', x: 68, y: 8, button: 'left' })
    for (const y of [6, 4, 2, 1, -3]) {
      await ui.pointer({ in: 'clawd', type: 'move', x: 68, y, button: 'left' })
      await ui.advance(100)
    }
    // Dragged past the top, it stops at the ceiling: region row 0 (swinging a column either way while held).
    expect(JSON.stringify(await ui.drawn({ in: 'clawd' }))).toMatch(/"top":0,"left":6[345]/)

    // Drop it: it falls back into its strip and lands stunned.
    await ui.pointer({ in: 'clawd', type: 'up', x: 68, y: -3, button: 'left' })
    let stunned
    for (let i = 0; i < 20 && !stunned; i++) {
      await ui.advance(100)
      stunned = await ui.find({ type: 'Text', text: /✦|✧/, in: 'clawd' })
    }
    expect(stunned).toBeDefined()

    // Hovering up over the other bars gives the room back, so they can be clicked.
    await ui.pointer({ in: 'clawd', type: 'move', x: 68, y: 2 })
    await ui.advance(100)
    expect(JSON.stringify(await ui.drawn())).not.toContain('"height":12')
    await ui.unmount()
  }
})

test('the region never starts growing in the middle of a drag', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
  await ui.advance(100)

  // A grab with no hover first: the region keeps its 4 rows while held.
  await ui.pointer({ in: 'clawd', type: 'down', x: 68, y: 2, button: 'left' })
  await ui.pointer({ in: 'clawd', type: 'move', x: 68, y: 0, button: 'left' })
  await ui.advance(300)
  expect(JSON.stringify(await ui.drawn())).not.toContain('"height":12')
  await ui.unmount()
})

const NAVY = '#1b2f5e' // the wizard hat

test('/clawd cosplay dresses Clawd up, and auto follows the tool Claude runs', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  on('command.register', () => ({ value: { command: 'clawd' } }))
  on('tool.call', () => ({ result: {} }))
  const wizardShown = async (ui: { drawn: (s?: { in?: string }) => Promise<unknown> }) =>
    JSON.stringify(await ui.drawn({ in: 'clawd' })).includes(NAVY)

  for (const surface of ['terminal', 'desktop'] as const) {
    // Picked by hand.
    const listed = await $.command.run({ command: 'clawd', args: 'cosplay' })
    expect(JSON.stringify(listed)).toContain('wizard')
    await $.command.run({ command: 'clawd', args: 'cosplay wizard' })
    let ui = await $.ui.mount({ ...BAR, surface } as never)
    await ui.advance(100)
    expect(await wizardShown(ui)).toBe(true)
    await ui.unmount()

    // Off: nothing worn, even while Claude runs a command.
    await $.command.run({ command: 'clawd', args: 'cosplay off' })
    await $.tool.call({ tool: 'Bash', command: 'ls' })
    ui = await $.ui.mount({ ...BAR, surface } as never)
    await ui.advance(100)
    expect(await wizardShown(ui)).toBe(false)
    await ui.unmount()

    // Auto: a Bash call puts the wizard hat on.
    await $.command.run({ command: 'clawd', args: 'cosplay auto' })
    await $.tool.call({ tool: 'Bash', command: 'ls' })
    ui = await $.ui.mount({ ...BAR, surface } as never)
    await ui.advance(100)
    expect(await wizardShown(ui)).toBe(true)
    await ui.unmount()
  }
})

test('the parachute costume opens on a high drop: a soft landing, no stars', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  on('command.register', () => ({ value: { command: 'clawd' } }))
  await $.command.run({ command: 'clawd', args: 'cosplay parachute' })
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
  await ui.advance(100)

  await ui.pointer({ in: 'clawd', type: 'move', x: 68, y: 2 })
  await ui.advance(100)
  await ui.pointer({ in: 'clawd', type: 'down', x: 68, y: 8, button: 'left' })
  for (const y of [6, 4, 2, 1, -3]) {
    await ui.pointer({ in: 'clawd', type: 'move', x: 68, y, button: 'left' })
    await ui.advance(100)
  }
  await ui.pointer({ in: 'clawd', type: 'up', x: 68, y: -3, button: 'left' })
  await ui.advance(200)
  expect(JSON.stringify(await ui.drawn({ in: 'clawd' }))).toContain('#2f5d9e') // the canopy

  let landed
  for (let i = 0; i < 40 && !landed; i++) {
    await ui.advance(100)
    landed = await ui.find({ type: 'Text', text: /Smooth landing/, in: 'clawd' })
  }
  expect(landed).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /✦|✧/, in: 'clawd' })).toBeUndefined()
  await ui.unmount()
})

test('/clawd cosplay demo shows every costume in turn, then goes back to auto', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  on('command.register', () => ({ value: { command: 'clawd' } }))
  await $.command.run({ command: 'clawd', args: 'cosplay demo' })
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)

  const shown: string[] = []
  for (let i = 0; i < 17 * 30 + 20; i++) {
    await ui.advance(100)
    const line = await ui.find({ type: 'Text', text: /^\d+\/17: /, in: 'clawd' })
    if (line?.text && !shown.includes(line.text)) shown.push(line.text)
  }
  expect(shown.map(t => t.replace(/^\d+\/17: /, ''))).toEqual([
    'detective', 'chef', 'coder', 'dj', 'wizard', 'reader', 'thinker', 'rocket', 'parachute',
    'spidercrab', 'batcrab', 'captain', 'party', 'cheer', 'santa', 'pumpkin', 'tet',
  ])
  const after = await $.command.run({ command: 'clawd', args: 'cosplay' })
  expect(JSON.stringify(after)).toContain('Now: auto')
  await ui.unmount()
})

const RED = '#d9452b' // spidercrab's suit
const GREY = '#bdbdbd' // batcrab's suit
const BLUE = '#2f5d9e' // captain's suit (spidercrab's arms too)
const WEB = '#6e1a10' // spidercrab's web lines

test('Opus 5.5 suits Clawd up as spidercrab, Haiku 5.5 as batcrab, Sonnet 5.5 as captain, others take it off', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('classic.PostModelSwitch', () => ({}))
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  const switchTo = (to_model: string) =>
    $.classic.PostModelSwitch({
      from_model: 'claude-fable-5-1',
      to_model,
      requested_model: null,
      source: 'command',
      context_tokens: 0,
    } as never)
  const drawn = async () => {
    const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
    await ui.advance(100)
    const tree = JSON.stringify(await ui.drawn({ in: 'clawd' }))
    await ui.unmount()
    return tree
  }

  await switchTo('claude-opus-5-5')
  expect(await drawn()).toContain(RED)
  await switchTo('claude-haiku-5-5')
  const bat = await drawn()
  expect(bat).toContain(GREY)
  expect(bat).not.toContain(RED)
  await switchTo('claude-sonnet-5-5')
  const cap = await drawn()
  expect(cap).toContain(BLUE)
  expect(cap).not.toContain(WEB)
  expect(cap).not.toContain(GREY)
  await switchTo('claude-fable-5-1')
  const plain = await drawn()
  expect(plain).not.toContain(RED)
  expect(plain).not.toContain(GREY)
})

test('a chat that starts on a model wears its suit without any /model switch', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  on('command.register', () => ({ value: { command: 'clawd' } }))
  on('ui.close', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  let model = 'claude-sonnet-5-5'
  on('session.model', () => ({ value: model }))
  const drawn = async () => {
    const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
    await ui.advance(100)
    const tree = JSON.stringify(await ui.drawn({ in: 'clawd' }))
    await ui.unmount()
    return tree
  }

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(await drawn()).toContain(BLUE) // captain
  expect(await drawn()).not.toContain(WEB)

  // /model shows names and aliases too: both still find the suit.
  for (const [name, colour] of [['Opus 5.5', WEB], ['haiku', GREY]] as const) {
    model = name
    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
    expect(await drawn()).toContain(colour)
  }

  model = 'claude-fable-5-1'
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const plain = await drawn()
  expect(plain).not.toContain(WEB)
  expect(plain).not.toContain(GREY)
  expect(plain).not.toContain(BLUE)
})

const EYE = '#1a1a1a'
const SWEAT = '#7fc4f0'
const ORANGE = '#f08a24' // the pumpkin

test('each running subagent brings a helper crab, gone once it returns', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  // Clawd has two eyes, each helper two more.
  const eyes = async () => {
    const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
    await ui.advance(100)
    const n = (JSON.stringify(await ui.drawn({ in: 'clawd' })).match(new RegExp(EYE, 'g')) ?? []).length
    await ui.unmount()
    return n
  }
  let during = 0
  on('tool.call', async () => {
    during = await eyes()
    return { result: {} }
  })

  await $.tool.call({ tool: 'Agent', description: 'look', prompt: 'look around' } as never)
  expect(during).toBe(4)
  expect(await eyes()).toBe(2)
})

test('commits and test runs get a word when they finish, passed or failed', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  // Stands for Bash: a command with "fail" in it fails.
  on('tool.call', (_, e) => (String((e as { command?: unknown }).command).includes('fail') ? { result: {}, isError: true } : { result: {} }) as never)
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
  await ui.advance(100)
  const said = async (command: string) => {
    await $.tool.call({ tool: 'Bash', command } as never)
    await ui.advance(100)
    return (await ui.find({ type: 'Text', text: /Committed|Tests (passed|failed)/, in: 'clawd' }))?.text
  }

  expect(await said('git commit -m "hi"')).toMatch(/Committed/)
  expect(await said('npm test')).toMatch(/Tests passed/)
  expect(await said('pytest # fail')).toMatch(/Tests failed/)
  await ui.unmount()
})

test('a turn past two minutes makes Clawd sweat', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  on('prompt.submit', (_, e) => ({ text: e.text }) as never)
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
  await $.prompt.submit({ text: 'a big job' } as never)
  await ui.advance(60_000)
  expect(JSON.stringify(await ui.drawn({ in: 'clawd' }))).not.toContain(SWEAT)
  await ui.advance(61_000)
  expect(JSON.stringify(await ui.drawn({ in: 'clawd' }))).toContain(SWEAT)
  await ui.unmount()
})

test('Clawd dresses for the season between jobs', async ($, on) => {
  const clock = mock.clock(on, { now: new Date(2026, 9, 28).getTime() })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  const drawn = async () => {
    const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
    await ui.advance(100)
    const tree = JSON.stringify(await ui.drawn({ in: 'clawd' }))
    await ui.unmount()
    return tree
  }

  expect(await drawn()).toContain(ORANGE) // a pumpkin for Halloween
  await clock.set(new Date(2026, 10, 3).getTime())
  const plain = await drawn()
  expect(plain).not.toContain(ORANGE)
  expect(plain).not.toContain(RED)
  await clock.set(new Date(2026, 11, 10).getTime())
  expect(await drawn()).toContain(RED) // a Santa hat
  await clock.set(new Date(2027, 1, 9).getTime())
  expect(await drawn()).toContain(STAR_YELLOW) // Tết: the mai blossom
})

const STAR_YELLOW = '#f5c542'

test('the thinking dots follow the effort level, and Clawd says when it changes', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  on('prompt.submit', (_, e) => ({ text: e.text }) as never)
  // Stands for the model: an empty answer, streamed as nothing.
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' } as never
  })
  // A streaming call runs as its stream is read: read it to the end.
  const step = async (effort: string, index = 0) => {
    const stream = $.turn.step({ turnId: 't', index, model: 'claude-opus-5-5', effort, messageCount: 1 } as never) as unknown as AsyncIterable<unknown>
    for await (const _ of stream);
  }
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
  await $.prompt.submit({ text: 'go' } as never)
  // The most dots seen over a few fill cycles.
  const mostDots = async () => {
    let most = 0
    for (let i = 0; i < 40; i++) {
      await ui.advance(100)
      const dots = await ui.find({ type: 'Text', text: /^ *·+$/, in: 'clawd' })
      most = Math.max(most, (dots?.text ?? '').trim().length)
    }
    return most
  }

  await step('low')
  expect(await mostDots()).toBe(1)
  // A later step of the same turn is no switch, whatever it says.
  await step('max', 1)
  expect(await mostDots()).toBe(1)

  await step('max')
  await ui.advance(100)
  expect(await ui.find({ type: 'Text', text: /Max effort/, in: 'clawd' })).toBeDefined()
  expect(await mostDots()).toBe(5)

  await step('low')
  await ui.advance(100)
  expect(await ui.find({ type: 'Text', text: /Low effort/, in: 'clawd' })).toBeDefined()
  await ui.unmount()
})

test('Clawd always rises 6 rows, and as high as taller bars above reach, as the probe measures them', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  // The probe reports the bars' height; hover the strip to lift, and read how tall the region grew.
  const liftedHeight = async (barRows: number) => {
    const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
    await ui.post({ barRows }, { in: 'probe' })
    await ui.advance(100)
    await ui.pointer({ in: 'clawd', type: 'move', x: 68, y: 2 })
    await ui.advance(100)
    const h = JSON.stringify(await ui.drawn()).match(/"key":"clawd".*?"height":(\d+)/)?.[1]
    await ui.unmount()
    return Number(h)
  }

  // Short bars never limit the drag: 6 rows of strip and the usual 6 above.
  expect(await liftedHeight(3)).toBe(12)
  // Bars 10 rows tall: Clawd can rise over all of them.
  expect(await liftedHeight(10)).toBe(16)
  // Taller than the band allows: capped at its 20 rows.
  expect(await liftedHeight(30)).toBe(20)
})

test('Clawd taps on whichever side of its head the outfit leaves clear', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  on('command.register', () => ({ value: { command: 'clawd' } }))
  on('prompt.edit', (_, e) => ({ text: e.text + e.inputText, cursor: e.text.length + e.inputText.length }) as never)
  // Where "tap tik" is drawn: the column of the Box holding it.
  const tapColumn = async (outfit: string) => {
    await $.command.run({ command: 'clawd', args: `cosplay ${outfit}` })
    const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
    await ui.advance(100)
    await $.prompt.edit({ origin: { kind: 'person' }, text: '', cursor: 0, start: 0, end: 0, inputText: 'h' } as never)
    let column: number | undefined
    for (let i = 0; i < 4 && column === undefined; i++) {
      await ui.advance(100)
      const m = JSON.stringify(await ui.drawn({ in: 'clawd' })).match(/"left":(\d+)\},"children":\[\{"type":"Text","props":\{"color":"#d97757"\},"children":\[" ?t(?:ap|ik)"\]/)
      if (m) column = Number(m[1])
    }
    await ui.unmount()
    return column
  }

  // Clawd stands at column 64: plain, it taps just right of its head; the wizard's wand is there, so it taps left.
  expect(await tapColumn('off')).toBe(73)
  expect(await tapColumn('wizard')).toBe(59)
  // The spidercrab's web is on the left: the right stays clear.
  expect(await tapColumn('spidercrab')).toBe(73)
})

const VISOR = '#5fd7ff'

test('ultracode turns Clawd into a flying hero that fires on idle, and a later prompt turns it back', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Text', null, 'other bar'))
  on('prompt.submit', (_, e) => ({ text: e.text }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
  await ui.advance(100)
  // The bar as laid out (the region's height), and what Clawd draws in it.
  const tree = async () => JSON.stringify(await ui.drawn())
  const crab = async () => JSON.stringify(await ui.drawn({ in: 'clawd' }))

  await $.prompt.submit({ text: 'ultracode: fix the login bug' } as never)
  let rings = false
  let shout = false
  for (let i = 0; i < 45; i++) {
    await ui.advance(100)
    rings ||= !!(await ui.find({ type: 'Text', text: '✦', in: 'clawd' }))
    shout ||= !!(await ui.find({ type: 'Text', text: /ULTRACODE!/, in: 'clawd' }))
  }
  expect(rings).toBe(true)
  expect(shout).toBe(true)
  // Suited up: the visor glows, and Clawd takes the room over the bars to fly in.
  expect(await crab()).toContain(VISOR)
  expect(await tree()).toContain('"height":12')

  // Idle, the hero fires at the sky and the ground.
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1, isAborted: false } as never)
  let missile = false
  for (let i = 0; i < 100 && !missile; i++) {
    await ui.advance(100)
    missile = !!(await ui.find({ type: 'Text', text: /^[↑↓↗↘↖↙]$/, in: 'clawd' }))
  }
  expect(missile).toBe(true)

  // Over the other bars, it gives their room back.
  await ui.pointer({ in: 'clawd', type: 'move', x: 5, y: 0 })
  let yielded = false
  for (let i = 0; i < 60 && !yielded; i++) {
    await ui.advance(100)
    yielded = !(await tree()).includes('"height":12')
  }
  expect(yielded).toBe(true)

  // A prompt without the word: armor off, plain Clawd again.
  await $.prompt.submit({ text: 'thanks' } as never)
  await ui.advance(5000)
  expect(await crab()).not.toContain(VISOR)
  await ui.unmount()
})

test('Clawd types along while you type, and stops a few seconds after', async ($, on) => {
  mock.clock(on, { now: NO_HOLIDAY })
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  // Stands for the prompt box: applies the edit.
  on('prompt.edit', (_, e) => ({ text: e.text.slice(0, e.start) + e.inputText + e.text.slice(e.end), cursor: e.start + e.inputText.length }) as never)
  const edit = (text: string, start: number, end: number, inputText: string) =>
    $.prompt.edit({ origin: { kind: 'person' }, text, cursor: start, start, end, inputText } as never)
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
  const tapping = async () => {
    // The tap and tik alternate every other tick: look at two in a row.
    let seen = false
    for (let i = 0; i < 2; i++) {
      await ui.advance(100)
      seen ||= !!(await ui.find({ type: 'Text', text: /^ ?t(ap|ik)$/, in: 'clawd' }))
    }
    return seen
  }
  await ui.advance(100)
  expect(await tapping()).toBe(false)

  await edit('', 0, 0, 'h')
  expect(await tapping()).toBe(true)

  // An arrow key only moves the cursor: it does not keep Clawd typing.
  await ui.advance(2000)
  await edit('h', 0, 0, '')
  await ui.advance(1000)
  expect(await tapping()).toBe(false)
  await ui.unmount()
})
