import type { ClientModule, ClientPointerEvent } from 'claude-code'

import type { PetProps } from '../types'

// One pixel is one cell, drawn as a coloured Box: the desktop app draws no block glyphs.
// Clawd as drawn in its art: a wide block, tall eyes, short arms at the sides, two pairs of legs.
const SPRITE_W = 10
const SPRITE_H = 4
const TICK_MS = 100
const GRAVITY = 0.35

const BODY = '#d97757'
const DARK = '#1a1a1a'
const STAR = '#f5c542'
const SAD = '#5b8fd9'

// Costume colours, one letter each; '.' is see-through.
const PALETTE: Record<string, string> = {
  o: BODY,
  k: '#55555f', // "black" props: a grey that still shows on a dark theme
  b: '#6b5b52', // hat brown
  w: '#f7f3ee', // white
  g: '#bdbdbd', // grey
  B: '#2f5d9e', // blue
  n: '#1b2f5e', // navy
  y: STAR, // yellow
  c: '#f6e3c3', // cream
  d: '#4a2c1a', // dark brown
  t: '#c98a3c', // tan
  r: '#d9452b', // red
  x: '#6e1a10', // spider web lines: a dark red, as black reads as holes on a dark theme
  p: '#f08a24', // pumpkin orange, brighter than Clawd
}
const SWEAT = '#7fc4f0'

// A costume is pieces drawn over the crab, placed from its top-left cell (rows above are negative).
type Piece = { ox: number; oy: number; rows: string[] }
// Keep the names in step with COSTUME_NAMES in register.tsx.
const COSTUMES: Record<string, Piece[]> = {
  detective: [
    { ox: 0, oy: -2, rows: ['..bbbbbb..', 'kbbbbbbbbk'] },
    { ox: 10, oy: 0, rows: ['.kk', 'kgk', 'kk.'] },
  ],
  chef: [
    { ox: 1, oy: -2, rows: ['wwwwwwww', '.gggggg.'] },
    { ox: 12, oy: 0, rows: ['y.y', '.y.'] },
    { ox: 10, oy: 2, rows: ['kkkkk'] },
  ],
  coder: [
    { ox: -3, oy: 0, rows: ['.c.', 'cdc', 'cc.'] },
    { ox: 6, oy: 2, rows: ['.kkkkk', 'kkkgkk'] },
  ],
  dj: [
    { ox: 7, oy: -2, rows: ['y.y'] },
    { ox: 0, oy: -1, rows: ['.nnnnnnnn.', 'B........B', 'B........B'] },
  ],
  wizard: [
    { ox: 0, oy: -2, rows: ['...nnn....', 'nnnnnnnnnn'] },
    { ox: 10, oy: -1, rows: ['.y.y', '..y.', '.d..', 'd...'] },
  ],
  reader: [{ ox: 0, oy: -2, rows: ['.cccccccc.', 'tttttttttt'] }],
  thinker: [{ ox: 10, oy: -2, rows: ['.wow', '.www', 'w...'] }],
  rocket: [
    { ox: 10, oy: 2, rows: ['kr'] },
    { ox: 13, oy: -1, rows: ['.n.', '.w.', 'BgB', 'BwB', '.y.'] },
  ],
  parachute: [{ ox: -1, oy: -3, rows: ['.BBBBBBBBBB.', 'BBccccccccBB', '.k........k.'] }],
  // The model suits: worn when /model switches to Opus 5.5 (spidercrab), Haiku 5.5 (batcrab) or Sonnet 5.5 (captain).
  spidercrab: [{ ox: 10, oy: -2, rows: ['..w', '.w.', 'w..'] }],
  batcrab: [
    { ox: 1, oy: -1, rows: ['k......k'] },
    { ox: 3, oy: 2, rows: ['yyyy'] },
    { ox: -1, oy: 1, rows: ['k', 'k', 'k'] },
    { ox: 10, oy: 1, rows: ['k', 'k', 'k'] },
  ],
  // Sonnet 5.5's suit: a round shield, red rim, white ring, blue centre.
  captain: [{ ox: 10, oy: 1, rows: ['.rrr.', 'rwBwr', '.rrr.'] }],
  // git commit: a party hat and confetti.
  party: [
    { ox: 4, oy: -2, rows: ['.y.', 'rBr'] },
    { ox: -1, oy: -2, rows: ['B', '.', 'r'] },
    { ox: 9, oy: -2, rows: ['y.B'] },
  ],
  // Test runs: pom-poms.
  cheer: [
    { ox: -2, oy: 1, rows: ['ry', 'yr'] },
    { ox: 10, oy: 1, rows: ['yr', 'ry'] },
  ],
  // Holiday outfits, worn between jobs in their season.
  santa: [{ ox: 1, oy: -2, rows: ['..rrrrrrw', 'wwwwwwww'] }],
  pumpkin: [{ ox: 10, oy: 1, rows: ['..d..', 'pkpkp', 'ppppp'] }],
  // Tết: a mai blossom and a red lì xì envelope.
  tet: [
    { ox: 2, oy: -2, rows: ['.y.', 'yty'] },
    { ox: 10, oy: 1, rows: ['rrr', 'ryr', 'rrr'] },
  ],
}
// A plaster on the head while sad after an error.
const BANDAGE: Piece = { ox: 6, oy: 0, rows: ['twt'] }
// Past this many ticks of one turn (2 minutes), Clawd sweats.
const LONG_TURN = 1200
// Clawd types along for this many ticks (3 seconds) after your last edit in the prompt box.
const TYPING = 30

// Suits recolour the crab itself, row by row (top, eyes, arms, legs), so every pose still shows through.
// `paint` gives body cells a colour of their own ('.' keeps the row's); eye cells are never painted over.
// `eyes` is the eye colour; without one the eyes stay Clawd's own.
const SUITS: Record<string, { rows: string[]; eyes?: string; paint?: string[] }> = {
  // Web lines, outlined eyes, a spider on the chest, blue arms and legs.
  spidercrab: { rows: ['r', 'r', 'r', 'B'], eyes: 'w', paint: ['..x.xx.x..', '.x.x..x.x.', 'BB..xx..BB'] },
  batcrab: { rows: ['k', 'k', 'g', 'k'], eyes: 'w' },
  // A blue suit, a white star on the chest, red gloves and boots.
  captain: { rows: ['B', 'B', 'B', 'r'], paint: ['..........', '..........', 'rr..ww..rr'] },
}

// /clawd cosplay demo: each costume in turn, this many ticks apiece, then back to auto.
const DEMO = Object.keys(COSTUMES)
const DEMO_TICKS = 30

type Mode = 'idle' | 'walk' | 'held' | 'fall' | 'jump' | 'stunned' | 'sleep' | 'wave' | 'sad'

type World = {
  props: PetProps
  t: number
  x: number
  y: number
  vx: number
  vy: number
  prevX: number
  prevY: number
  mode: Mode
  until: number
  face: -1 | 0 | 1
  targetX: number
  homeX: number
  bubble: string
  bubbleUntil: number
  seenSay: number
  lastActive: number
  nextChat: number
  grab: { dx: number; dy: number; moved: number; talked: boolean } | null
  lifted: boolean
  hover: boolean
  // High drops so far: every third one opens a parachute instead of a hard landing.
  drops: number
  chute: boolean
  costume: string | null
  costumeAt: number
  demoShown: number
  isDemoDone: boolean
  // The tick the current turn started on, or -1 between turns.
  workSince: number
  seenTyped: number
  typedAt: number
}

const CHATTER = [
  'Need a hand? I have two.',
  'Sideways is the fastest way forward.',
  'Saved your work lately?',
  'I read the whole diff. Mostly.',
  'Tests first, snacks later.',
  'Drink some water!',
  'Psst… drag me around.',
  'Small commits, happy crab.',
  'Try /clawd cosplay wizard',
  'Is it a bug or a feature?',
]
const CLICK = ['Hi there!', 'Hehe, that tickles!', 'Boop!', 'Yes?', '*happy clicking*']
const DRAG = ['Wheee!', 'Hey! Put me down!', 'Where are we going?', 'I can see my house!']
const STUNNED = ['Whoa… the floor moved.', 'Ow. Seeing stars ✦', 'Who threw that crab?!', '@_@']

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)] ?? ''

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return "It's past midnight. Save and get some rest soon?"
  if (h < 12) return 'Good morning! Coffee first, code second.'
  if (h < 18) return 'Good afternoon! What are we building?'
  return 'Evening coding session? Count me in.'
}

function say(w: World, text: string, ticks = 45) {
  w.bubble = text
  w.bubbleUntil = w.t + Math.max(ticks, Math.round(text.length * 1.5))
}

function setMode(w: World, mode: Mode, ticks = 0) {
  w.mode = mode
  w.until = w.t + ticks
}

const isTyping = (w: World) => w.t - w.typedAt < TYPING

function wake(w: World) {
  w.lastActive = w.t
  if (w.mode === 'sleep') setMode(w, 'idle')
}

function step(w: World, cols: number, rows: number) {
  w.t++
  const ground = Math.max(0, rows - SPRITE_H)
  const maxX = Math.max(0, cols - SPRITE_W)
  const p = w.props
  // The region has no width until its first layout: settle home then.
  if (w.homeX < 0 && cols > 0) {
    w.homeX = Math.max(0, cols - SPRITE_W - 6)
    w.x = w.prevX = w.homeX
  }
  if (p.costume !== w.costume) {
    w.costume = p.costume
    w.costumeAt = w.t
    w.demoShown = -1
    w.isDemoDone = false
  }
  if (p.costume === 'demo') {
    const i = Math.floor((w.t - w.costumeAt) / DEMO_TICKS)
    if (i !== w.demoShown && i < DEMO.length) {
      w.demoShown = i
      say(w, `${i + 1}/${DEMO.length}: ${DEMO[i]}`, DEMO_TICKS - 2)
    }
  }

  if (p.say && p.say.id !== w.seenSay) {
    w.seenSay = p.say.id
    wake(w)
    say(w, p.say.text)
    if (w.mode !== 'held' && w.mode !== 'fall') {
      if (p.say.kind === 'done') jump(w)
      if (p.say.kind === 'error') setMode(w, 'sad', 25)
    }
  }
  if (p.typed !== w.seenTyped) {
    w.seenTyped = p.typed
    w.typedAt = w.t
    wake(w)
    // Stop wandering and face front to type along.
    if (w.mode === 'walk') {
      w.face = 0
      setMode(w, 'idle')
    }
  }
  if (p.mood === 'working') w.lastActive = w.t
  if (p.mood !== 'working') w.workSince = -1
  else if (w.workSince < 0) w.workSince = w.t
  else if (w.t - w.workSince === LONG_TURN && w.mode !== 'held') say(w, pick(['Phew, this is a big one!', 'Still going… I need a snack.']))

  switch (w.mode) {
    case 'held':
      // Throw speed is how far the pointer dragged it during the last tick.
      w.vx = w.x - w.prevX
      w.vy = w.y - w.prevY
      break
    case 'fall':
    case 'jump': {
      w.vy += GRAVITY
      if (w.chute) w.vy = Math.min(w.vy, 0.3) // drifts down under the canopy
      w.x += w.vx
      w.y += w.vy
      if (w.x < 0 || w.x > maxX) {
        w.x = Math.min(Math.max(w.x, 0), maxX)
        w.vx = -w.vx * 0.6
      }
      if (w.y < -p.offset) {
        w.y = -p.offset
        w.vy = Math.abs(w.vy) * 0.3
      }
      if (w.y >= ground) {
        const hard = w.mode === 'fall' && !w.chute && (w.vy > 1.8 || Math.abs(w.vx) > 2)
        w.y = ground
        w.vx = 0
        w.vy = 0
        if (hard) {
          setMode(w, 'stunned', 35)
          say(w, pick(STUNNED), 35)
        } else {
          if (w.chute) say(w, 'Smooth landing!', 25)
          setMode(w, 'idle')
        }
        w.chute = false
      }
      break
    }
    case 'walk': {
      const d = w.targetX - w.x
      w.face = d < 0 ? -1 : 1
      // One whole cell per step, on the frames where a pair of legs comes down.
      if (w.t % 2 === 0) w.x += Math.sign(d) * Math.min(Math.abs(d), 1)
      if (Math.abs(w.targetX - w.x) < 0.5) {
        w.face = 0
        setMode(w, 'idle')
      }
      break
    }
    case 'stunned':
      if (w.t >= w.until) {
        w.targetX = Math.min(w.homeX, maxX)
        setMode(w, 'walk')
        if (Math.random() < 0.5) say(w, '…where was I?', 25)
      }
      break
    case 'sleep':
      break
    default:
      // idle, wave, sad: timed poses fall back to idle
      if (w.mode !== 'idle' && w.t >= w.until) setMode(w, 'idle')
      if (w.mode !== 'idle' || isTyping(w)) break
      if (p.mood === 'idle' && w.t - w.lastActive > 900) {
        setMode(w, 'sleep')
        w.face = 0
        break
      }
      if (p.mood === 'idle' && w.t >= w.nextChat) {
        w.nextChat = w.t + 300 + Math.floor(Math.random() * 300)
        say(w, pick(CHATTER))
      }
      if (p.mood === 'idle' && Math.random() < 1 / 70) {
        w.targetX = Math.floor(Math.random() * (maxX + 1))
        setMode(w, 'walk')
      }
  }
  if (w.mode !== 'held' && w.mode !== 'fall' && w.mode !== 'jump') w.y = ground
  w.x = Math.min(Math.max(w.x, 0), maxX)
  w.prevX = w.x
  w.prevY = w.y
}

function jump(w: World) {
  w.vy = -1 // a hop that fits the bar
  w.vx = 0
  setMode(w, 'jump')
}

function pointer(w: World, e: ClientPointerEvent) {
  // Rows in the crab's strip: the region reaches `offset` rows higher while it is lifted.
  const ey = e.y - w.props.offset
  const inside = e.x >= w.x && e.x < w.x + SPRITE_W && ey >= w.y && ey < w.y + SPRITE_H
  if (e.type === 'down' && e.button === 'left' && inside) {
    wake(w)
    w.grab = { dx: e.x - w.x, dy: ey - w.y, moved: 0, talked: false }
    w.prevX = w.x
    w.prevY = w.y
    setMode(w, 'held')
  } else if (e.type === 'move' && w.grab && w.mode === 'held') {
    const nx = e.x - w.grab.dx
    const ny = ey - w.grab.dy
    w.grab.moved += Math.abs(nx - w.x) + Math.abs(ny - w.y)
    w.x = nx
    // Above the strip (negative rows) it paints over the other bars.
    w.y = Math.max(-w.props.offset, ny)
    if (w.grab.moved >= 3 && !w.grab.talked) {
      w.grab.talked = true
      say(w, pick(DRAG), 25)
    }
  } else if (e.type === 'up' && w.grab) {
    const clicked = w.grab.moved < 1
    w.grab = null
    if (clicked) {
      say(w, Math.random() < 0.3 ? pick(CHATTER) : pick(CLICK), 30)
      jump(w)
    } else {
      w.vx = Math.max(-4, Math.min(4, w.vx))
      w.vy = Math.max(-3, Math.min(3, w.vy))
      // Dropped from above the strip: the parachute costume always opens, otherwise every third drop.
      if (w.y < -1) {
        w.drops++
        w.chute = w.props.costume === 'parachute' || w.drops % 3 === 0
      }
      setMode(w, 'fall')
    }
  } else if (e.type === 'enter' && w.mode === 'idle') {
    wake(w)
    setMode(w, 'wave', 15)
  }
  // Hovering the crab's own strip readies the room above; hovering up over the other bars gives it back.
  if (e.type === 'leave') w.hover = false
  else if (!e.button) w.hover = ey >= 0
}

// The standing legs, then each pair lifted in turn: legs keep their spots, as a crab's crawl does.
const STAND = '.o.o..o.o.'
const WALK_LEGS = [STAND, '...o....o.', STAND, '.o....o...']

// '.' empty, 'o' body, 'L'/'R' eyes. Rows: top of the body, eyes, arms, legs.
function spriteRows(w: World): string[] {
  const f = w.face
  const top = '.oooooooo.'
  const eyes = '.' + 'oooooooo'.split('').map((c, i) => (i === 1 + f ? 'L' : i === 6 + f ? 'R' : c)).join('') + '.'
  const flip = Math.floor(w.t / 2) % 2 === 0

  if (w.mode === 'held' || w.mode === 'fall' || w.mode === 'jump') {
    // arms up, legs kicking while held
    const legs = w.mode === 'held' && !flip ? '..o.oo.o..' : STAND
    return [top, 'o' + eyes.slice(1, 9) + 'o', '.oooooooo.', legs]
  }
  if (w.mode === 'sleep') return ['..........', top, eyes, 'oooooooooo'] // legs tucked
  if (w.mode === 'wave' && flip) return [top, eyes.slice(0, 9) + 'o', 'ooooooooo.', STAND]
  if (w.mode === 'walk') return [top, eyes, 'oooooooooo', WALK_LEGS[Math.floor(w.t / 2) % 4] ?? STAND]
  // typing: arms tap down while Claude works, or along with you
  if ((w.props.mood === 'working' || isTyping(w)) && w.mode === 'idle' && flip) return [top, eyes, '.oooooooo.', 'oo.o..o.oo']
  return [top, eyes, 'oooooooooo', STAND]
}

function eyeColor(w: World): string {
  if (w.mode === 'sleep' || w.t % 47 === 0) return BODY // closed
  if (w.mode === 'stunned') return w.t % 4 < 2 ? STAR : DARK
  if (w.mode === 'sad') return SAD
  return DARK
}

// What the crab wears now: its pose can call for one (the parachute, the book over a sleeping crab).
function wearing(w: World): string | null {
  if (w.chute && w.mode === 'fall') return 'parachute'
  const c = w.props.costume
  if (c === 'demo') return DEMO[Math.max(0, Math.min(w.demoShown, DEMO.length - 1))] ?? null
  if (w.props.isAutoCostume) {
    if (w.mode === 'sleep') return 'reader'
    // Between jobs it wears its model's suit, if any, else headphones once idle a while.
    const rest = w.props.restCostume
    if (c === 'rocket' && w.t - w.costumeAt > 50) return rest // the launch is over
    if (!c) return rest ?? (w.props.mood === 'idle' && w.t - w.lastActive > 400 ? 'dj' : null)
  }
  if (c === 'parachute') return w.mode === 'fall' ? c : null // packed until it falls
  return c && COSTUMES[c] ? c : null
}

const Clawd: ClientModule<PetProps, { w: World }> = (props, s) => {
  const { Box, Text } = s.elements

  if (!s.state) {
    const w: World = {
      props,
      t: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      prevX: 0,
      prevY: 0,
      mode: 'idle',
      until: 0,
      face: 0,
      targetX: 0,
      homeX: -1,
      bubble: '',
      bubbleUntil: 0,
      seenSay: props.say?.id ?? 0,
      lastActive: 0,
      nextChat: 200,
      grab: null,
      lifted: false,
      hover: false,
      drops: 0,
      chute: false,
      costume: props.costume,
      costumeAt: 0,
      demoShown: -1,
      isDemoDone: false,
      workSince: -1,
      seenTyped: props.typed,
      typedAt: -TYPING,
    }
    say(w, timeGreeting(), 60)
    s.every(TICK_MS, () => {
      const cur = s.state!.w
      step(cur, cur.props.columns, cur.props.rows)
      // Ask for the room above on hover and while falling; give it back once landed and left.
      // Never start growing mid-drag: the desktop app loses the held pointer when the region resizes.
      const wantLift = cur.hover || cur.mode === 'fall' || (cur.mode === 'held' && cur.lifted)
      if (wantLift !== cur.lifted) {
        cur.lifted = wantLift
        s.post({ lifted: wantLift })
      } else if (cur.props.costume === 'demo' && !cur.isDemoDone && cur.t - cur.costumeAt >= DEMO.length * DEMO_TICKS) {
        cur.isDemoDone = true
        s.post({ isDemoDone: true })
      }
      s.setState({ w: cur })
    })
    s.onPointer(e => {
      const cur = s.state!.w
      pointer(cur, e)
      s.setState({ w: cur })
    })
    s.setState({ w })
  }
  const w = s.state?.w
  if (!w) return <Box />
  w.props = props

  const x = Math.round(w.x)
  const y = Math.round(w.y)
  const flip = Math.floor(w.t / 2) % 2 === 0
  const swing = w.mode === 'held' ? (flip ? -1 : 1) : w.mode === 'stunned' ? (Math.floor(w.t / 3) % 2 ? -1 : 1) : 0
  const eye = eyeColor(w)
  const costume = wearing(w)

  const row = (colors: Record<string, string>) => (line: string, r: number) => {
    const runs: { c: string; n: number }[] = []
    for (const c of line) {
      const last = runs[runs.length - 1]
      if (last && last.c === c) last.n++
      else runs.push({ c, n: 1 })
    }
    return (
      <Box key={`r${r}`} flexDirection="row" height={1}>
        {runs.map((run, i) => (
          <Box key={String(i)} width={run.n} height={1} backgroundColor={colors[run.c]} />
        ))}
      </Box>
    )
  }
  const crabColors = { o: BODY, L: eye, R: eye }
  const suit = costume ? SUITS[costume] : undefined
  const crabRow = (line: string, r: number) => {
    if (!suit) return row(crabColors)(line, r)
    // A sleeping crab sits a row lower: its rows start one later.
    const sr = w.mode === 'sleep' ? r - 1 : r
    const body = PALETTE[suit.rows[sr] ?? suit.rows[0] ?? 'o'] ?? BODY
    const eyes = eye === DARK ? ((suit.eyes && PALETTE[suit.eyes]) ?? eye) : eye === BODY ? body : eye
    const paint = suit.paint?.[sr]
    const painted = paint ? [...line].map((c, i) => (c === 'o' && paint[i] && paint[i] !== '.' ? paint[i] : c)).join('') : line
    return row({ ...PALETTE, o: body, L: eyes, R: eyes })(painted, r)
  }

  // Effects drawn just above the head.
  let fx: { text: string; color: string; dx: number } | null = null
  if (w.mode === 'stunned') {
    const ring = ['✦ · ✧ ·', '· ✧ · ✦', '✧ · ✦ ·', '· ✦ · ✧']
    fx = { text: ring[Math.floor(w.t / 2) % 4] ?? '', color: STAR, dx: 2 }
  } else if (w.mode === 'sleep') {
    const z = ['z', ' z', '  Z', '   Z ']
    fx = { text: z[Math.floor(w.t / 6) % 4] ?? '', color: '#8fa3bf', dx: SPRITE_W - 2 }
  } else if (w.mode === 'jump') {
    fx = { text: flip ? '✦        ✦' : ' ✧      ✧', color: STAR, dx: 0 }
  } else if (w.workSince >= 0 && w.t - w.workSince >= LONG_TURN && w.mode !== 'held') {
    // Sweat drops flicking off one side of the head, then the other.
    fx = { text: "'", color: SWEAT, dx: flip ? -1 : SPRITE_W }
  } else if (isTyping(w) && w.mode === 'idle') {
    fx = { text: flip ? 'tap' : ' tik', color: BODY, dx: SPRITE_W - 1 }
  } else if (w.props.mood === 'working' && w.mode !== 'held' && !costume) {
    fx = { text: ['·  ', '·· ', '···'][Math.floor(w.t / 4) % 3] ?? '', color: BODY, dx: SPRITE_W - 1 }
  }

  const showBubble = w.bubble && w.t < w.bubbleUntil
  // A one-line bubble beside the crab, on whichever side has room, clear of what it holds.
  const bubbleW = Math.min(w.bubble.length + 4, Math.max(12, Math.min(60, props.columns - SPRITE_W - 8)))
  const rightOf = x + SPRITE_W + 5
  const bubbleLeft = rightOf + bubbleW <= props.columns ? rightOf : Math.max(0, x - bubbleW - 4)
  const bubbleTop = Math.max(0, props.rows - 3)
  const left = x + swing
  const pieces = [...(costume ? (COSTUMES[costume] ?? []) : []), ...(w.mode === 'sad' ? [BANDAGE] : [])]
  // Helper crabs trail behind Clawd on the ground, or run ahead where there is no room behind.
  const helperXs = Array.from({ length: Math.min(3, props.helpers) }, (_, i) => (x - 6 * (i + 1) >= 0 ? x - 6 * (i + 1) : x + SPRITE_W + 2 + 6 * i))
  const helperRow = row({ o: BODY, L: DARK, R: DARK })

  return (
    <Box width={props.columns} height={props.rows + props.offset}>
      {showBubble && (
        <Box position="absolute" top={bubbleTop + props.offset} left={bubbleLeft} width={bubbleW} borderStyle="round" borderColor={BODY} paddingX={1}>
          <Text wrap="truncate-end">{w.bubble}</Text>
        </Box>
      )}
      {fx && y > -props.offset && (
        <Box position="absolute" top={y - 1 + props.offset} left={Math.max(0, left + fx.dx)}>
          <Text color={fx.color}>{fx.text}</Text>
        </Box>
      )}
      <Box position="absolute" top={y + props.offset} left={Math.max(0, left)} flexDirection="column">
        {spriteRows(w).map(crabRow)}
      </Box>
      {pieces.map((piece, i) => (
        <Box key={`c${i}`} position="absolute" top={y + piece.oy + props.offset} left={left + piece.ox} flexDirection="column">
          {piece.rows.map(row(PALETTE))}
        </Box>
      ))}
      {helperXs.map((hx, i) => (
        <Box key={`h${i}`} position="absolute" top={props.rows - 2 + props.offset} left={hx} flexDirection="column">
          {['LooR', (w.t + i) % 4 < 2 ? 'o..o' : '.oo.'].map(helperRow)}
        </Box>
      ))}
    </Box>
  )
}

export default Clawd
