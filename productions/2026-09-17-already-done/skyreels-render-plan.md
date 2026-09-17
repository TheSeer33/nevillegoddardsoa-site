# SkyReels Render Plan — 11:00 Flagship + Shorts

## Engine
Official upstream: `SkyworkAI/SkyReels-V2`
Pinned commit reviewed: `9351d13152207cc04de780e055346b08ade0b851`
Preferred model: `Skywork/SkyReels-V2-T2V-14B-720P`
Fallback for constrained GPU: 540P T2V / I2V official Skywork model, then upscale only with a separately approved local open-source upscaler.

## Delivery
- Master: 1920x1080, 24fps, H.264/AAC, ~11:00
- Shorts: 1080x1920, 24/30fps, 35–55 sec
- No paid video APIs
- No HeyGen
- No Neville voice imitation
- Original narration only

## Visual identity
1950s New York metaphysical lecture atmosphere × cinematic modern editorial × warm tungsten night interiors × deep blue city exteriors. Realistic human motion. Filmic grain. High contrast. No generic “galaxy manifestation” spam. No raining cash. No fake banking brands.

## Clip-generation strategy
SkyReels is used to generate 5–10 second motion clips. Clips are assembled with FFmpeg/Remotion into the 11-minute program. The model is not asked to generate an 11-minute single take.

### Recurring visual motifs
1. 1950s New York lecture room at night, male lecturer seen mostly from side/back, no claim that the face is an exact historical reconstruction.
2. Steamship / Barbados travel imagery, period luggage, ocean horizon, passport/ticket motifs without fake logos.
3. Modern person obsessively refreshing phone / bank app with no readable private data.
4. Same person later calm, phone face-down, coffee / desk / sunrise.
5. Short cinematic “ordinary aftermath” scenes: signed contract, peaceful kitchen, stable relationship text notification, creative work completed.
6. Abstract but grounded state-transition visuals: doorway, train leaving station, room lighting changing from cold to warm.

## Scene prompts

### S01 Hook — waiting identity
`Cinematic modern apartment at night, anxious person seated at desk repeatedly checking smartphone and refreshing an unreadable banking or message interface, subtle restless hand movement, rain on window, city bokeh, dramatic practical lamp light, realistic skin and hands, shallow depth of field, slow push-in, premium documentary aesthetic, no readable text, no logos`

### S02 Technique overload
`Fast cinematic montage feeling: journal pages, sticky notes, affirmation cards, meditation timer, person switching frantically between notebook and phone, realistic motion, premium editorial lighting, dark warm palette, handheld micro movement, no readable copyrighted text`

### S03 Abdullah / Barbados motif
`1950s New York apartment or lecture room at night, two adult men in period suits speaking calmly, one seated with absolute certainty while the other looks doubtful, warm tungsten lamps, rain outside window, period-correct furniture, cinematic 35mm look, no celebrity likeness requirement, slow dolly`

### S04 Barbados arrival implication
`1950s Caribbean harbor at golden hour, steamship in distance, elegant traveler stepping onto dock with small suitcase, palms moving in sea breeze, warm sun, natural human motion, filmic historical drama, no modern signage`

### S05 Naturalness
`Morning close-up montage of ordinary certainties: hand unlocking apartment door, coffee cup placed on desk, phone resting face down, person tying shoes, calm confident movement, natural light, cinematic realism`

### S06 Can't visualize
`Person lying in dark bedroom before sleep, eyes closed, very subtle breathing, sound-imagery metaphor shown visually as soft memory fragments of a handshake and a friend's smile forming gently in darkness, tasteful cinematic double exposure, no supernatural beams`

### S07 Self-concept waiting room
`Person standing before a long hallway of mirrors, each reflection slightly different posture, then walking past the mirrors toward a warmly lit open doorway, metaphor for leaving endless self-improvement behind, realistic cinematic surrealism, smooth camera move`

### S08 Persist vs let go
`Hand tightly gripping rope then gradually releasing tension without dropping it, sunrise light, macro cinematic photography, metaphor for persistence without desperation, realistic physics, slow motion`

### S09 Five-minute practice
`Quiet bedroom before sleep, notebook closed, phone placed away, person settles comfortably, soft bedside lamp, peaceful breathing, first-person glimpse of a short imagined scene: signed agreement on desk and calm smile, cinematic, no readable legal text`

### S10 Morning 3D unchanged
`Morning city commute, same person sees ordinary bills and email notifications but remains calm, gets dressed, opens laptop, sends a professional proposal, purposeful movement, documentary cinematic style, no readable private content`

### S11 Final Barbados callback
`Ocean horizon at sunrise from deck of a period steamship, Caribbean island in distance, warm light through clouds, calm water, subtle forward camera movement, feeling of certainty and arrival, cinematic 35mm realism`

## Edit rhythm
- cold open: cuts every 2–4 sec for first 20 sec
- average clip duration after hook: 5–8 sec
- visual reset every 20–30 sec
- chapter title cards max 1.0 sec; no long intro
- kinetic text only for high-value phrases: `STILL TRYING`, `THE END`, `NATURALNESS`, `PERSIST IN THE STATE`, `ALREADY DONE`
- use J/L audio cuts so narration never feels segmented

## Narration
Warm, contemporary male narrator, intimate and certain, not theatrical, not an imitation of Neville Goddard.
Target pace: 140–150 wpm with intentional pauses.

## Music
Original or license-safe low-volume cinematic ambient bed. No copyrighted commercial songs. Build intensity under hook, reduce beneath guided five-minute method section, lift subtly in close.

## Shorts derivatives
### Short 1 — The Barbados Rule
Hook: `You keep manifesting the fact that you're still waiting.`
Core: Abdullah / “You are in Barbados” / already-done identity.
CTA: full explanation on channel.

### Short 2 — You don't need vivid visualization
Hook: `If you can't visualize clearly, that is not your problem.`
Core: implication > picture quality.

### Short 3 — Persist or let go?
Hook: `Persist and let go are not opposites.`
Core: persist in state; let go of desperate monitoring.

## QA gates
- no clip with obvious hand/face deformation survives final cut
- no readable AI-generated gibberish text
- no accidental celebrity likeness presented as authentic footage
- no fake historical archival labeling
- no claim that manifestation guarantees financial, relationship, medical, or other outcomes
- ffprobe master and Shorts
- captions checked for overflow and timing
- audio peak / loudness QA
- visual spot-check at 30-second intervals
