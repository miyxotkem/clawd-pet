import { expect, test } from 'claude-code/testing'

const BAR = {
  plugin: 'clawd-pet',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80 },
} as const

test('thrown crab lands stunned, on every surface that draws it', async ($, on) => {
  // Stands for the engine's own (empty) bar beneath this one.
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAR, surface } as never)
    // No resize: the desktop app sizes a Client from what it draws, so the module must not wait for one.
    await ui.advance(100)

    // It greets by time of day.
    expect(await ui.find({ type: 'Text', text: /morning|afternoon|Evening|midnight/, in: 'clawd' })).toBeDefined()

    // Crab rests at the right side: columns 64..73, rows 2..5 of the 6-row bar. Grab it and fling it left.
    await ui.pointer({ type: 'down', x: 68, y: 2, button: 'left' })
    await ui.advance(100)
    await ui.pointer({ type: 'move', x: 30, y: 0, button: 'left' })
    await ui.advance(100)
    await ui.pointer({ type: 'up', x: 30, y: 0, button: 'left' })

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
  on('ui.render', { component: 'AbovePrompt' }, () => h('Text', null, 'other bar'))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAR, surface } as never)
    await ui.advance(100)

    // Hover the crab's strip: its region grows 6 rows up over the bars before any drag starts.
    await ui.pointer({ type: 'move', x: 68, y: 2 })
    await ui.advance(100)
    expect(JSON.stringify(await ui.drawn())).toContain('"height":12')

    // Grab it (strip row 2 is region row 8) and drag slowly up to the top: 6 rows above the strip.
    await ui.pointer({ type: 'down', x: 68, y: 8, button: 'left' })
    for (const y of [6, 4, 2, 1, -3]) {
      await ui.pointer({ type: 'move', x: 68, y, button: 'left' })
      await ui.advance(100)
    }
    // Dragged past the top, it stops at the ceiling: region row 0 (swinging a column either way while held).
    expect(JSON.stringify(await ui.drawn({ in: 'clawd' }))).toMatch(/"top":0,"left":6[345]/)

    // Drop it: it falls back into its strip and lands stunned.
    await ui.pointer({ type: 'up', x: 68, y: -3, button: 'left' })
    let stunned
    for (let i = 0; i < 20 && !stunned; i++) {
      await ui.advance(100)
      stunned = await ui.find({ type: 'Text', text: /✦|✧/, in: 'clawd' })
    }
    expect(stunned).toBeDefined()

    // Hovering up over the other bars gives the room back, so they can be clicked.
    await ui.pointer({ type: 'move', x: 68, y: 2 })
    await ui.advance(100)
    expect(JSON.stringify(await ui.drawn())).not.toContain('"height":12')
    await ui.unmount()
  }
})

test('the region never starts growing in the middle of a drag', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
  await ui.advance(100)

  // A grab with no hover first: the region keeps its 4 rows while held.
  await ui.pointer({ type: 'down', x: 68, y: 2, button: 'left' })
  await ui.pointer({ type: 'move', x: 68, y: 0, button: 'left' })
  await ui.advance(300)
  expect(JSON.stringify(await ui.drawn())).not.toContain('"height":12')
  await ui.unmount()
})

const NAVY = '#1b2f5e' // the wizard hat

test('/clawd cosplay dresses Clawd up, and auto follows the tool Claude runs', async ($, on) => {
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
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  on('command.register', () => ({ value: { command: 'clawd' } }))
  await $.command.run({ command: 'clawd', args: 'cosplay parachute' })
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)
  await ui.advance(100)

  await ui.pointer({ type: 'move', x: 68, y: 2 })
  await ui.advance(100)
  await ui.pointer({ type: 'down', x: 68, y: 8, button: 'left' })
  for (const y of [6, 4, 2, 1, -3]) {
    await ui.pointer({ type: 'move', x: 68, y, button: 'left' })
    await ui.advance(100)
  }
  await ui.pointer({ type: 'up', x: 68, y: -3, button: 'left' })
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
  on('ui.render', { component: 'AbovePrompt' }, () => h('Box', null))
  on('command.register', () => ({ value: { command: 'clawd' } }))
  await $.command.run({ command: 'clawd', args: 'cosplay demo' })
  const ui = await $.ui.mount({ ...BAR, surface: 'desktop' } as never)

  const shown: string[] = []
  for (let i = 0; i < 12 * 30 + 20; i++) {
    await ui.advance(100)
    const line = await ui.find({ type: 'Text', text: /^\d+\/12: /, in: 'clawd' })
    if (line?.text && !shown.includes(line.text)) shown.push(line.text)
  }
  expect(shown.map(t => t.replace(/^\d+\/12: /, ''))).toEqual(
    ['detective', 'chef', 'coder', 'dj', 'wizard', 'reader', 'thinker', 'rocket', 'parachute', 'spidercrab', 'batcrab', 'captain'],
  )
  const after = await $.command.run({ command: 'clawd', args: 'cosplay' })
  expect(JSON.stringify(after)).toContain('Now: auto')
  await ui.unmount()
})

const RED = '#d9452b' // spidercrab's suit
const GREY = '#bdbdbd' // batcrab's suit
const BLUE = '#2f5d9e' // captain's suit (spidercrab's arms too)
const WEB = '#6e1a10' // spidercrab's web lines

test('Opus 5.5 suits Clawd up as spidercrab, Haiku 5.5 as batcrab, Sonnet 5.5 as captain, others take it off', async ($, on) => {
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
