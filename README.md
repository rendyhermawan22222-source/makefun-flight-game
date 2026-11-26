# makefun-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/rendyhermawan22222-source/makefun-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/rendyhermawan22222-source/makefun-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Nusantara Skies — a 3D flight game over the Indonesian archipelago at dawn. Fly the island-hopper Garuda Kecil from Pulau Merdeka: thread sky rings, deliver cargo between island strips, land on a 210 m short strip, and run a storm front in rain and gusts. Throttle and turn discipline matter — fuel burns, hard landings bend the airframe, and the wing stalls if you get slow.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network — the game is static files under `game/` (three.js vendored as `game/vendor/three.min.js`).

## Controls

- **W / S** throttle · **↑ ↓** pitch · **← → / A D** bank & turn · **mouse drag** steer
- **1–4** pick a mission · **C** cockpit / chase camera · **B** brake · **R** reset · **P** pause · **M** sound

## Missions

1. **Ring Time Trial** — thread 8 sky rings around the islands, beat 3:00 for gold.
2. **Island Hop Delivery** — land cargo gently on Pulau Karang, then Pulau Kabut.
3. **Short Strip Landing** — put her down on Kabut's 210 m strip, scored on softness and centreline.
4. **Storm Front Run** — six storm gates in driving rain and gusts, with tight fuel.

---

<sub>Entered on [make.fun](https://make.fun/?ref=731kem14&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
