# Concept image index

All eight images are preserved locally in this directory. Generated with the built-in image-generation tool (six on 12 September 2026, two on 13 September) for visual exploration, not as executable screens. The three connected concepts were positively received by the user.

## Current direction: four playrooms, shared gameplay

Space Playroom uses the three connected concepts below. Sweet Playroom uses the original pastel room as a primary reference. Both are required; the sweet room is not replaced by the space room. The Heart and K-pop playrooms (D21) have their own dated folder:

| File | Purpose |
| --- | --- |
| [2026-09-13-new-playrooms/START_HERE.md](2026-09-13-new-playrooms/START_HERE.md) | The concept-stage handoff for the two rooms: what the drawings fix and what they leave open |
| [2026-09-13-new-playrooms/01-heart-playroom.png](2026-09-13-new-playrooms/01-heart-playroom.png) | **Heart Playroom reference:** blush, rose, peach and mint; heart rug, shelving, nook, garland and lamp; bunny toys |
| [2026-09-13-new-playrooms/02-kpop-demon-hunters-playroom.png](2026-09-13-new-playrooms/02-kpop-demon-hunters-playroom.png) | **K-pop Playroom reference:** lavender, plum and gold; karaoke stage, microphones, light sticks, blue tiger, magpie, evening city window |
| [2026-09-13-new-playrooms/prompts.md](2026-09-13-new-playrooms/prompts.md) | The generation prompts of both drawings |

Both are the direction, not the specification: the room and item art of `assets/hearts/` and `assets/kpop/` is generated from them with the pipeline of SPEC §15 (`tools/manifest-data.ts` names them as the references), and the game's own screens (real clocks, real counters, the existing mission flows) replace the panels the drawings sketch.

| File | Purpose |
| --- | --- |
| [early-playroom.png](early-playroom.png) | **Sweet Playroom primary reference:** peach, mint, flowers, hearts, toys and cat |
| [01-room-and-wardrobe.png](01-room-and-wardrobe.png) | **Space Playroom primary reference:** home room, character dress-up and mission entry |
| [02-space-delivery-elapsed-time.png](02-space-delivery-elapsed-time.png) | 14:30 → 19:15 elapsed-time mission and correct jump hints |
| [03-mission-reward.png](03-mission-reward.png) | Earn a room decoration or clothing item and apply it |

## Earlier exploration

| File | Decision |
| --- | --- |
| [early-space-club.png](early-space-club.png) | Preferred theme; incorporated into current direction |
| [early-clock-town.png](early-clock-town.png) | Explored but not selected |

## Generation brief record

The following are concise records of the prompts used, not exact transcripts:

- **Shared current brief:** landscape browser-game UI concepts for a seven-year-old, original cosy dollhouse cartoon feeling, rounded dark-plum outlines, peach/mint room with lavender/blue space accents. Brown-haired heroine with two buns, lilac shirt, mint skirt, yellow socks, and friendly turquoise alien. Large rounded English text and tactile controls; no browser chrome.
- **Room:** bedroom on left, wardrobe panel on right with Clothes/Hair/Shoes; moon bed, star lamp, toy rocket, room and dress-up controls, next-prize previews.
- **Mission:** space delivery of a rug; Leaves 14:30, Arrives 19:15; answers 4 h 15 min, 4 h 45 min, 5 h; expanded jumps 14:30 → 18:30 → 19:00 → 19:15 with +4 h, +30 min, +15 min; question 3 of 4.
- **Reward:** mission complete after four puzzles, choice of rainbow rug or space boots; rug selected, “Put it in my room”, room preview and celebration.
- **Early concepts:** separate pastel playroom, colourful town and friendly spaceship settings, each with a central 3:30 analog clock, digital answer buttons and Turkish difficulty labels.

Production must recreate clocks, labels and controls as real UI, check all clock geometry, and normalize character/item consistency. Do not ship these complete mockup images as a substitute for functioning gameplay.
