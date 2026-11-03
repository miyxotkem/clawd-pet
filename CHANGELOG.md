# Changelog

## 1.1.3 (2026-11-03)

A hotfix: subagents no longer end Clawd's turn early.

- **Subagents finishing mid-turn.** When Claude runs subagents, each one finishing used to look like the whole turn ending: Clawd said "Done!" and jumped while Claude was still working, stopped its thinking dots, wiped every helper crab, and in hero mode started firing as if idle. Now only your main turn ending counts.

## 1.1.2 (2026-11-03)

A hotfix: Clawd's DJ headphones are back.

- **Headphones when idle.** After 40 seconds idle between jobs, Clawd puts its headphones on again. They never showed before: a model suit always took their place, and after a turn that ended well Clawd went straight back to its rest outfit. Now they go on in both cases, with a model suit kept on underneath, so you get a spidercrab or captain with headphones.

## 1.1.1 (2026-11-03)

A hotfix: Clawd now notices an effort switch as you make it.

- **Effort switches show right away.** Pick a level in the desktop app's effort menu and Clawd says so within a second; set one with `/effort` and it says so as the panel closes. Before, it waited for your next prompt. Going up, it still jumps.
- **Knows the level from the start.** A new session reads its effort level before the first prompt, so the thinking dots are right from the first turn.

## 1.1.0 (2026-11-03)

Clawd reacts to far more of what you and Claude do, dresses for the season, and has a secret.

### New

- **Ultracode hero (a secret).** Turn ultracode on in `/effort` (Tab in the slider, `/effort ultracode on`, or the desktop app's effort menu). Clawd drops its costume, charges up, and transforms: rings of light race across the whole bar while white armor builds up from its legs, then a flash. The hero flies instead of walking, with thrusters blazing at 45 degrees from its lower corners. While Claude is idle it fires missiles from its back in any direction, straight, in parabolas, curves and loops, weaving, or in clusters that split in three. They burst into fireworks in the sky and blasts with smoke on the ground. Move the pointer over the other bars and it drops low so you can click them. Turning ultracode off takes the armor off; in the air, it parachutes down.
- **Thinks as hard as Claude.** While Claude works, thinking dots fill up beside Clawd's head: one slow dot on low effort, up to five quick yellow ones on max. When the level changes, Clawd says so on the next prompt, with a jump when it goes up.
- **Types along.** While you type in the prompt box, Clawd stops wandering and taps along with "tap tik", on whichever side of its head its outfit leaves clear.
- **Helper crabs.** Each subagent Claude starts brings a small crab that walks beside Clawd until it returns, up to three at once.
- **Commits, pushes and tests.** A party hat for `git commit`, the rocket for `git push`, and pom-poms while tests run (`npm test`, `pytest`, `cargo test` and the like). When the command finishes, Clawd cheers or looks sad.
- **Sweat and bandage.** After two minutes on one turn Clawd starts to sweat, and when a turn fails it wears a bandage.
- **Holiday outfits.** Between jobs, a pumpkin from October 24 to 31, a Santa hat from December 1 to 26, and a mai blossom with a lì xì envelope for a week either side of Tết.
- **Five new costumes:** `party`, `cheer`, `santa`, `pumpkin` and `tet`, for 17 in all. `/clawd cosplay demo` shows them all.
- **Knows the bars above.** Clawd measures the bars above the prompt. It can always be lifted 6 rows, and further when those bars are taller.

### Changed

- The thinking dots moved to the left of Clawd's head and now show with any costume on.
- The spidercrab's web points left, clear of what Clawd says on its right.
- The costumes picture in the README shows all 17.

## 1.0.0 (2026-11-03)

The first release: a pixel Clawd that lives in a small bar above the Claude Code prompt.

- **Walks and talks:** crawls around, blinks, chats, greets you by time of day, and naps when things are quiet.
- **Reacts to Claude:** comments when you send a prompt and as Claude uses tools, types along while Claude works, and jumps when a turn finishes.
- **Drag and throw:** pick Clawd up, even over the bars above the prompt. Drop or fling it hard and it lands stunned; every third high drop it opens a parachute.
- **12 costumes:** detective, chef, coder, dj, wizard, reader, thinker, rocket, parachute, spidercrab, batcrab and captain. By default Clawd dresses for what Claude is doing.
- **Model suits:** spidercrab on Opus 5.5, batcrab on Haiku 5.5, captain on Sonnet 5.5.
- **Commands:** `/clawd`, `/clawd hide`, `/clawd <text>`, `/clawd cosplay <costume|auto|off|demo>`.
