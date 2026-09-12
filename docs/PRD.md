# My Cosmic Room — Product Requirements

Status: concept-approved PRD; ready for specification, not implementation.
Date: 12 September 2026. Updated to require two separate playroom themes. Working title: My Cosmic Room (provisional; an umbrella name covering both themes remains open).

## 1. Purpose and audience

Create a browser-based mini-game that helps a seven-year-old learn analog and digital clocks and calculate elapsed time. The child can already read whole hours. Her parent wants multiple difficulty levels and meaningful games and prizes to keep practice fun. She enjoys Toca Boca and specifically likes the playroom and space themes, room decoration, and character dress-up.

The experience offers two distinct selectable playrooms: Space Playroom and Sweet Playroom. Both use the same learning activities, difficulty rules and decorate/dress-up reward loop, with their own settings, stories and themed items. The sweet room is a separate experience based on the original pastel playroom image, not simply more decoration inside the space room. Learning earns objects the child can use in her room or wardrobe. The approved visual direction is playful, friendly and original; do not copy existing Toca Boca characters or branding.

## 2. Decision status

### Confirmed by the user

- Browser-based play on a computer.
- Analog and digital clock learning with multiple difficulty levels.
- Two distinct playroom themes in the initial scope: Space Playroom and Sweet Playroom. Decorating and dressing up are important in both.
- Both themes share the same game idea and learning/reward mechanics; neither is an optional later theme.
- Games and prizes should make practice fun.
- Include the difference between two times, explicitly including 14:30 to 19:15.
- Elapsed-time answers should use whole and quarter hours. This PRD interprets that as 15-minute increments, including 30 and 45 minutes; the user accepted visuals displaying 4 hours 45 minutes.
- The three connected concept screens were positively received as the design direction.
- Current deliverable is a saved PRD and concepts. The next session should produce a specification document.

### Proposed defaults to carry into specification

- Four puzzles per mission (within the previously proposed range of 3–5).
- No countdowns, lost lives, or penalties for using help.
- Predictable, visible prizes; no random loot boxes or purchases.
- A furnished starting room and a small usable wardrobe.
- Start with half-hours; full hours remain available as a warm-up. Longer elapsed-time tasks are a later difficulty.
- Same-day elapsed-time calculations in the initial release; no midnight crossing.
- Save progress on the current device, subject to a storage decision in the specification.

These are product proposals, not separately confirmed user requirements. Do not silently treat every suggested feature from the conversation as launch scope.

## 3. Core experience

Choose a playroom theme → room and wardrobe → choose a mission and see its available rewards → solve four clock puzzles with optional help → choose one earned reward → place it or wear it → continue free play or start another mission.

The room is the home screen and a playable space. The child can change outfits, position supported decorations and interact with selected objects. A themed entry leads to missions: a toy rocket in Space Playroom; the Sweet Playroom equivalent will be specified. Earned objects remain available for reuse.

The latest mockups show reward selection after the mission; earlier discussion suggested selection before it. Proposed resolution: preview the two available rewards before departure, then choose one after completing the mission. The specification should resolve this explicitly and keep the flow consistent.

## 4. Learning requirements

### Read and match clocks

- Match an analog clock to a digital time.
- Include the reverse direction: given a digital time, identify its analog equivalent.
- Render all twelve hour numerals correctly, distinguish hands by length as well as colour, and show minute marks appropriate to the level.
- The hour hand must move continuously with minutes; at 3:30 it is halfway between 3 and 4.
- Do not imply that an unlabeled 12-hour analog face distinguishes 03:30 from 15:30. Supply day-period context when needed.

### Set the clock

- Given a target time, let the child move the clock hands and check the answer.
- Snap to the precision of the selected level.
- Provide an accessible alternative to dragging. Detailed input and hour/minute coupling behavior belong in the specification.

### Calculate elapsed time

- Show a start and end time and ask how long the interval lasts.
- Use 24-hour digital displays for examples such as 14:30 → 19:15.
- Present answer choices in hours and minutes, all at 15-minute precision for this activity.
- The required example has the correct answer **4 hours 45 minutes**; example distractors are **4 hours 15 minutes** and **5 hours**.
- Optional help breaks the interval into visible, arithmetically correct jumps:
  - 14:30 → 18:30: +4 hours.
  - 18:30 → 19:00: +30 minutes.
  - 19:00 → 19:15: +15 minutes.
- The hint timeline must keep point labels and intervals aligned. Decide whether the timeline is proportional or explicitly a sequence of jumps; the concept is illustrative, not a scale specification.
- Elapsed-time precision is independent of any eventual one-minute clock-reading level.

### Difficulty progression

| Skill | Introductory | Intermediate | Advanced |
| --- | --- | --- | --- |
| Reading and setting | Whole hours, then half-hours | Quarter past and quarter to | Five-minute increments; individual minutes optional later |
| Elapsed time | Whole-hour gaps, e.g. 14:00 → 17:00 | Short quarter-hour gaps, e.g. 14:30 → 15:15 | Multi-hour gaps with quarters, e.g. 14:30 → 19:15 |

Levels should be selectable by the parent or child, rather than making difficult tasks mandatory before the room can be enjoyed. Precise progression/unlocking rules remain open.

## 5. Initial game scope

### Shared activity 1: read, match and set

Space variant — Rocket launch: the rocket has a departure time. The child reads, matches or sets a clock to prepare it. A correct completion triggers a short launch or preparation reaction. This supplies both analog and digital practice.

Sweet variant — proposed Tea-party time: read, match or set the clock to prepare a toy tea party. Use the same question rules and input mechanics with sweet-room characters and reactions. The story/name is proposed, not yet confirmed.

### Shared activity 2: elapsed time

Space variant — Space delivery: a decoration or outfit parcel is travelling between planets. The child compares departure and arrival times and identifies the travel duration. This is the elapsed-time game shown in the approved concept.

Sweet variant — proposed Toy delivery: compare the departure and arrival times of a toy delivery to the room. Include the same 14:30 → 19:15 example and optional jumps. The story/name is proposed, not yet confirmed.

These are two shared learning activities with a presentation for each theme, not four independently designed game systems. Both themes must offer the full set of learning skills and difficulties.

### Later candidates, not required for the first release

Alien café (match snack orders to clocks), planet navigation, and additional party mini-games are retained ideas. They should not displace elapsed-time questions from the first version. The two initial games should differ in interaction and feedback, not only background artwork.

## 6. Room, character and rewards

Initial scope: two distinct themed playrooms, character customisation and a usable starter wardrobe in each, supported decoration positions or movement, and bounded themed rewards for both. Proposed inventory target: one initial collection per theme, with exact item counts and placement mechanics defined in the specification. Both rooms must feel complete and support the same reward loop.

Proposed switching behavior: both themes are available from the start; switching preserves each room’s decoration layout and all earned items. Learning progress is shared so changing themes does not require repeating unlocks. Whether outfits and items can cross themes, and whether the same avatar outfit is shared, remain specification decisions.

- The child can choose and change clothes and shoes. Hair choices are shown in the concept; their launch inclusion is open.
- Earned decorations can be placed and changed without being consumed.
- Earned clothing can be worn and changed without being consumed.
- Show a useful preview and clear selection state before applying an item.
- Reward actions should suit the item: “Put it in my room” for a rug, “Wear it” for boots.
- Returning to the room should visibly reflect the selected reward.
- Include some simple item reactions so the room supports play between missions. Exact reactions and art costs must be scoped before implementation.
- Avoid duplicate-only rewards that make a completed mission feel wasted; define repeat-play behavior in the specification.

Suggested collections, not a committed asset list:

| Collection | Decorations | Dress-up |
| --- | --- | --- |
| Moon Sleepover | Moon bed, star lamp | Cloud pyjamas, bunny slippers |
| Rainbow Explorer | Rainbow rug, planet mobile | Colourful spacesuit, rocket backpack |
| Sweet Sleepover — proposed sweet collection | Flower cushion, pastel rug, heart lamp | Floral pyjamas, cat slippers |
| Alien Disco — later candidate | Disco light, musical speaker | Antenna headband, shiny boots |

The concept illustrations include more furnishings than the proposed reward inventory. Background scenery must not be assumed to be interactive or earnable without specification.

## 7. Feedback and child-friendly behavior

- A wrong answer gives a relevant visual cue and permits another attempt; it does not remove progress or rewards.
- Hints do not disqualify the child from a mission prize.
- Correct answers receive brief, varied character reactions; mission completion has a small celebration.
- Keep clocks and answer controls dominant during learning. Decorative elements must not obscure or compete with the task.
- Provide large controls, readable text, clear focus/selection states and comfortable mouse interaction.
- Do not rely on colour alone for instruction or correctness.
- No advertising, purchases, social feeds, daily streak pressure or personal information collection is needed for this product.
- Audio, narration and reduced-motion behavior require a scope decision; do not assume generated mockups specify them.

## 8. Visual direction and references

The three connected space concepts and the original sweet playroom image are the primary references for the two-theme product. They were generated with the built-in image-generation tool as UI concept illustrations. They are not working interfaces or production-ready layered assets.

1. [Room and wardrobe](concepts/01-room-and-wardrobe.png): warm peach room, moon bed, purple/mint character wardrobe, toy rocket, dress-up panel.
2. [Space delivery and elapsed-time help](concepts/02-space-delivery-elapsed-time.png): clear learning panel within a purple cockpit, two digital times, three answers and optional time jumps.
3. [Mission reward](concepts/03-mission-reward.png): earned choice between rainbow rug and space boots, immediate application to the room.

4. [Sweet Playroom](concepts/early-playroom.png): primary reference for the second room—peach walls, mint shelves, flower cushion, hearts, toys and a friendly cat. This image establishes the sweet-room art direction; dedicated wardrobe and reward layouts for it are still to be specified using the shared interaction patterns.

Preserve a consistent original character and each theme’s room between its screens. Mockup objects, exact geometry, decorative lettering and minor character variations are not binding. Functional clocks and all production text must be rendered accurately by the application rather than baked into illustrative backgrounds.

Earlier exploration is archived in [the concepts index](concepts/README.md). The original playroom image is now an active primary reference, not superseded exploration. The town theme is not selected.

## 9. Success and acceptance criteria

- Both Space Playroom and Sweet Playroom are available with their own visual identity, decoration options, outfits and mission presentation.
- Both themes support the same clock skills, difficulty levels, hints and reward rules.
- Switching themes must not discard earned rewards or room customisation; the exact save model is defined in the spec.
- The child can start a mission directly from her room, finish it with help if needed, receive an item and use it.
- The initial release includes analog reading, digital matching, clock setting and elapsed-time questions across the two mission types.
- Different difficulty settings generate questions at their intended precision.
- The 14:30 → 19:15 example is accepted only as 4 hours 45 minutes, and its help is mathematically correct.
- Answer choices are distinct with exactly one correct answer; retrying cannot grant duplicate completion rewards.
- Analog hour-hand positions reflect minutes correctly.
- Clothing and decoration changes are visible, reversible and retained according to the chosen save policy.
- The parent can select an easier or harder level without losing the room or inventory.
- Gameplay is understandable and usable on a computer browser without precise dragging being the only input method.

A parent-and-child play session should evaluate whether instructions are understandable, the difficulty is suitable, and decorating remains enjoyable between missions. No analytics backend is required to evaluate the prototype.

## 10. Open decisions for the specification session

1. **Language:** the original conversation and early concepts were Turkish; later discussion and approved connected concepts are English. Confirm Turkish, English or a language toggle before authoring final game text.
2. **Difficulty:** separate reading and elapsed-time level selectors, progression rules and whether five-minute/one-minute reading belongs in the initial release.
3. **Rewards:** finalize preview/selection timing, initial inventory, reward count and behavior after all rewards are owned.
4. **Room interaction:** fixed placement slots versus constrained dragging; which objects have playful reactions.
5. **Character:** hair options, clothing slots and the number of starting choices.
6. **Persistence:** local-device save recommended for the first version; cross-device accounts are not requested. Specify reset/recovery behavior.
7. **Audio and access:** narration, effects, mute, keyboard alternatives, reduced motion and target browser/device support.
8. **Two-theme behavior:** theme switching, shared learning progression, per-room layouts, cross-theme inventory/outfits, sweet mission names and a bounded art inventory for both themes.
9. **Product name:** keep My Cosmic Room as a temporary working title; choose an umbrella title if needed for the sweet theme.
10. **Implementation and delivery:** stack, asset pipeline and hosting should be selected in the spec. No site was registered or deployed during concept work.

## 11. Outside current scope

No implementation is requested in this session. Also outside initial scope unless explicitly added: multiplayer, accounts, cloud sync, payments, public sharing, teacher dashboards, midnight-spanning intervals, calendar arithmetic, unlimited room building, or all previously brainstormed mini-games.

Next deliverable: a specification document translating this PRD into screens, interactions, content/data models, puzzle-generation rules, reward/state transitions, save behavior, asset requirements and a testable implementation plan.
