/**
 * Source data for assets/manifest.json: sizes per slot, generation prompts and the
 * non-catalogue assets from SPEC §15.3. Prompts are one sentence; the style block is
 * added by tools/gen-assets.ts (SPEC §15.6).
 */
import type {
  AnchorKind,
  AssetEntry,
  FigureAnchors,
  GenPreset,
  TileCrop,
} from '../src/assetTypes.ts';
import type { SlotType } from '../src/core/types.ts';

export const SPACE_REF = 'docs/concepts/01-room-and-wardrobe.png';
export const SWEET_REF = 'docs/concepts/early-playroom.png';
export const HEROINE_SHEET = 'shared/heroine/referenceSheet';

/** Room-layer sizes at 2× and their pivot (bottom centre unless noted). */
export const SLOT_SIZES: Record<SlotType, { size: [number, number]; pivot: [number, number] }> = {
  BED: { size: [640, 420], pivot: [320, 420] },
  RUG: { size: [620, 300], pivot: [310, 150] },
  LAMP: { size: [200, 280], pivot: [100, 280] },
  WALL: { size: [320, 260], pivot: [160, 130] },
  SHELF: { size: [200, 200], pivot: [100, 200] },
  HANGING: { size: [300, 380], pivot: [150, 0] },
  NOOK: { size: [340, 260], pivot: [170, 260] },
};

/** Items whose silhouette does not fit the slot's default box (a wide string on the HANGING slot). */
export const SIZE_OVERRIDES: Record<string, { size: [number, number]; pivot: [number, number] }> = {
  'sweet.bunting': { size: [720, 220], pivot: [360, 0] },
};

export const TILE_SIZE: [number, number] = [360, 360];

/** Decoration prompts and presets by item name (SPEC §15.6 rubric). */
export const DECORATION_GEN: Record<string, { prompt: string; preset: GenPreset }> = {
  // Space starters
  'space.plainBed': {
    prompt:
      "a simple child's bed with a plain blue blanket, white pillow and a low rounded headboard",
    preset: 'astra-light',
  },
  'space.plainRug': {
    prompt: 'a plain round lavender rug lying flat on the floor, seen from slightly above',
    preset: 'sol-med',
  },
  'space.plainLamp': {
    prompt: 'a small plain bedside lamp with a mint shade and a wooden base, seen straight on',
    preset: 'sol-med',
  },
  'space.rocketPoster': {
    prompt:
      'a framed poster of a friendly cartoon rocket on a lavender background, hanging flat on a wall and seen straight on',
    preset: 'sol-med',
  },
  'space.astronautFigure': {
    prompt:
      'a small toy astronaut figure standing upright, white suit with a round helmet, seen straight on',
    preset: 'sol-med',
  },
  'space.paperStars': {
    prompt:
      'a vertical string of yellow paper stars hanging down from a single point at the top on a thin thread',
    preset: 'sol-med',
  },
  'space.purpleBeanbag': { prompt: 'a soft round purple beanbag on the floor', preset: 'sol-med' },
  // Moon Sleepover
  'space.moonBed': {
    prompt:
      "a child's bed shaped like a crescent moon with star-patterned purple bedding and a soft pillow",
    preset: 'astra-light',
  },
  'space.starLamp': {
    prompt: 'a bedside lamp shaped like a glowing yellow star on a short stand, seen straight on',
    preset: 'sol-med',
  },
  'space.astroBunny': {
    prompt: 'a small plush bunny wearing a tiny astronaut helmet, sitting',
    preset: 'sol-med',
  },
  // Rainbow Explorer
  'space.rainbowRug': {
    prompt:
      'a semicircular rainbow rug with soft pastel stripes lying flat on the floor, seen from slightly above',
    preset: 'sol-med',
  },
  'space.planetMobile': {
    prompt:
      'a hanging mobile with four small pastel planets and a moon on threads under a wooden bar, hanging from a single point at the top',
    preset: 'astra-light',
  },
  'space.galaxyPoster': {
    prompt:
      'a framed poster of a swirling pastel galaxy with tiny stars, hanging flat on a wall and seen straight on',
    preset: 'sol-med',
  },
  // Sweet starters
  'sweet.plainBed': {
    prompt:
      "a simple child's bed with a plain pink blanket, white pillow and a low rounded headboard",
    preset: 'astra-light',
  },
  'sweet.plainRug': {
    prompt: 'a plain round cream rug with small pastel dots seen from slightly above',
    preset: 'sol-med',
  },
  'sweet.plainLamp': {
    prompt: 'a small plain bedside lamp with a pink shade and a wooden base',
    preset: 'sol-med',
  },
  'sweet.tulipPicture': {
    prompt: 'a framed picture of three pastel tulips in a little vase',
    preset: 'sol-med',
  },
  'sweet.bunnyPlush': {
    prompt: 'a small soft grey plush bunny sitting upright',
    preset: 'sol-med',
  },
  'sweet.bunting': { prompt: 'a hanging string of small pastel triangle flags', preset: 'sol-med' },
  'sweet.yellowCushion': {
    prompt: 'a plump yellow square sofa cushion on the floor',
    preset: 'sol-med',
  },
  // Sweet Sleepover
  'sweet.flowerCushion': {
    prompt: 'a round floor cushion shaped like a pink flower with a yellow centre',
    preset: 'sol-med',
  },
  'sweet.pastelRug': {
    prompt: 'a round rug with soft pastel pink, mint and lilac rings seen from slightly above',
    preset: 'sol-med',
  },
  'sweet.heartLamp': {
    prompt: 'a bedside lamp shaped like a glowing pink heart on a short stand',
    preset: 'sol-med',
  },
  // Sunny Garden
  'sweet.daisyBed': {
    prompt:
      "a child's bed with a headboard shaped like a big white daisy and green leaf-patterned bedding",
    preset: 'astra-light',
  },
  'sweet.butterflyMobile': {
    prompt: 'a hanging mobile with five pastel butterflies on threads under a wooden ring',
    preset: 'astra-light',
  },
  'sweet.sunPoster': {
    prompt: 'a framed poster of a smiling yellow sun over pastel hills',
    preset: 'sol-med',
  },
};

/** Garment descriptions for the heroine reference sheet and tiles (hand-drawn SVG, not generated). */
export const GARMENT_LABELS: Record<string, string> = {
  'shared.hairBuns': 'brown hair in two buns',
  'shared.hairPonytail': 'brown hair in a high ponytail',
  'shared.hairLoose': 'loose brown hair with a clip',
  'shared.outfitPlanetTee': 'lilac planet tee with mint skirt',
  'shared.outfitFloralSweater': 'floral sweater with pinafore',
  'shared.outfitStarHoodie': 'star hoodie with trousers',
  'shared.shoesSneakers': 'yellow socks with white sneakers',
  'shared.shoesMaryJanes': 'pink mary-janes',
  'space.cloudPyjamas': 'cloud pyjamas',
  'space.bunnySlippers': 'bunny slippers',
  'space.starClip': 'star hair clip',
  'space.spacesuit': 'colourful spacesuit',
  'space.spaceBoots': 'space boots',
  'space.rocketBackpack': 'rocket backpack',
  'sweet.floralPyjamas': 'floral pyjamas',
  'sweet.catSlippers': 'cat slippers',
  'sweet.flowerClip': 'flower hair clip',
  'sweet.strawberryDress': 'strawberry dress',
  'sweet.rainbowSandals': 'rainbow sandals',
  'sweet.bowHeadband': 'bow headband',
};

/** Heroine figures (SPEC §4.5): one raster per outfit × hairstyle, all generated from the sheet. */
export const HEROINE_CANVAS: [number, number] = [600, 900];

/**
 * Default anchors on the 600 × 900 figure canvas, tuned on the first generated figures (the
 * pose is the same in every figure); post-processing scales the y values to where the girl
 * actually lands on the canvas, and `?debug=heroine` nudges them per figure.
 */
export const DEFAULT_ANCHORS: FigureAnchors = {
  face: { x: 300, y: 190, scale: 1 },
  head: { x: 300, y: 80, scale: 0.8 },
  feet: { x: 300, y: 895, scale: 0.78 },
  back: { x: 300, y: 420, scale: 0.9 },
};

/** Outfit descriptions by figure name (the outfit item's `art.figure`). */
export const OUTFIT_PROMPTS: Record<string, string> = {
  planetTee:
    'a lilac short-sleeved tee with a purple ringed planet and small yellow stars on the chest and a pleated mint skirt',
  floralSweater:
    'a lilac long-sleeved sweater patterned with small white daisies under a mint pinafore dress',
  starHoodie:
    'a dark navy hoodie with small yellow stars and a crescent moon, hood down, with matching navy trousers',
  cloudPyjamas:
    'light blue long-sleeved pyjamas, top and trousers, patterned with small white clouds',
  spacesuit:
    "a colourful child's spacesuit without a helmet: a white suit with lavender and coral panels, a round mint chest badge and a yellow collar ring",
  floralPyjamas:
    'soft pink long-sleeved pyjamas, top and trousers, patterned with small pastel flowers',
  strawberryDress:
    'a coral-red short-sleeved dress patterned with tiny strawberries, with a white round collar and a green leaf-shaped hem',
};

/** Hairstyle descriptions by figure name (the hair item's `art.figure`). */
export const HAIR_PROMPTS: Record<string, string> = {
  buns: 'the same brown hair in two buns as in the reference sheet',
  ponytail:
    'her brown hair in a high ponytail tied with a yellow scrunchie, as in the middle head of the bottom row of the reference sheet',
  loose:
    'her brown hair loose and wavy to the shoulders with a small plain yellow hair clip on the left side of the image, as in the right-hand head of the bottom row of the reference sheet',
};

/**
 * Sitting figures (SPEC §4.3): the same girl cross-legged on a 600 × 600 canvas, bottom
 * aligned; her feet are tucked away, so the shoe overlays are not drawn on her. The default
 * anchors are guessed by post-processing from her silhouette, like the standing figure's.
 */
export const SIT_CANVAS: [number, number] = [600, 600];
export const DEFAULT_SIT_ANCHORS: FigureAnchors = {
  face: { x: 300, y: 150, scale: 1 },
  head: { x: 300, y: 55, scale: 0.8 },
  feet: { x: 300, y: 595, scale: 0.78 },
  back: { x: 300, y: 330, scale: 0.9 },
};

/** Sleeping heads (SPEC §4.3): one per hairstyle, the head alone, drawn on the bed's pillow. */
export const SLEEP_SIZE: [number, number] = [360, 320];

export function sitPrompt(outfit: string, hair: string): string {
  return (
    `the exact same seven-year-old girl heroine from the attached reference sheet (same face, same skin tone, same proportions), with ${HAIR_PROMPTS[hair]}, ` +
    `full body, front view, sitting on the ground cross-legged with her hands resting in her lap, relaxed and upright, now wearing ${OUTFIT_PROMPTS[outfit]}, ` +
    'her feet tucked under her legs and out of sight, neutral small closed-mouth smile'
  );
}

export function sleepPrompt(hair: string): string {
  return (
    `only the head of the exact same seven-year-old girl heroine from the attached reference sheet (same face, same skin tone), with ${HAIR_PROMPTS[hair]}, ` +
    'front view, upright, fast asleep: both eyes gently closed with small lashes, relaxed eyebrows, a small content smile, pink blush; ' +
    'the whole head with its hair and ears, cut off just under the chin, no neck, no shoulders, no body, no pillow'
  );
}

export function figurePrompt(outfit: string, hair: string): string {
  return (
    `the exact same seven-year-old girl heroine from the attached reference sheet (same face, same skin tone, same proportions), with ${HAIR_PROMPTS[hair]}, ` +
    `full body, front view, standing in the same relaxed pose as the sheet with her arms slightly out from her sides, now wearing ${OUTFIT_PROMPTS[outfit]}, ` +
    'plain short white ankle socks and no shoes, feet flat on the ground, neutral small closed-mouth smile'
  );
}

export const FACES: [string, string][] = [
  ['happy', 'happy expression: closed smiling eyes and a big open smile'],
  [
    'thinking',
    'thinking expression: eyes looking up to one side, one eyebrow raised, a small closed mouth pulled to one side',
  ],
  [
    'cheering',
    'cheering expression: closed happy eyes, raised eyebrows and a wide open cheering mouth',
  ],
];
export const FACE_SIZE: [number, number] = [260, 220];

export interface OverlaySpec {
  prompt: string;
  preset: GenPreset;
  anchor: AnchorKind;
  size: [number, number];
  /** Point of the overlay that lands on the anchor; bottom centre for feet, centre otherwise. */
  pivot: [number, number];
  offset?: [number, number];
  /** Shoes whose art continues above the shoe (socks, legs, a boot shaft): see AssetEntry. */
  clipAtAnkle?: boolean;
  tileCrop: TileCrop;
}

const shoes = (prompt: string, clipAtAnkle = false): OverlaySpec => ({
  prompt: `a pair of ${prompt}, front view, the two shoes side by side and slightly apart, standing flat as worn by the girl from the attached reference sheet, toes towards the viewer`,
  preset: 'sol-med',
  anchor: 'feet',
  size: [300, 200],
  pivot: [150, 200],
  clipAtAnkle,
  tileCrop: 'feet',
});

/**
 * Shoe and extra overlays by item name (SPEC §4.5): generated cut-outs snapped to the figure.
 * Shoes drawn with socks, legs or a shaft above the shoe are clipped at the figure's ankle cut
 * (the slippers, whose ears rise above the ankle, are not); their `scale` in the manifest is
 * tuned so the overlay's socks are as wide as the figure's legs (each half is placed on its
 * own leg from the measured `footX` / `legX`, so the pair's spacing does not matter).
 */
export const OVERLAY_GEN: Record<string, OverlaySpec> = {
  sneakers: shoes(
    'white low sneakers with white laces, worn with yellow crew socks with two thin white stripes',
    true,
  ),
  maryJanes: shoes(
    'pink mary-jane shoes with a strap and a tiny bow, worn with short white socks',
    true,
  ),
  bunnySlippers: shoes('fluffy white bunny slippers with pink inner ears and little faces'),
  spaceBoots: shoes('chunky white space boots with lavender soles and small yellow stars', true),
  catSlippers: shoes('soft grey cat slippers with pointed ears, whiskers and pink noses'),
  rainbowSandals: shoes(
    'rainbow-striped sandals with a toe strap and an ankle strap, worn over short white socks',
    true,
  ),
  starClip: {
    prompt: 'a small yellow star hair clip with a short clip bar, seen from the front',
    preset: 'sol-med',
    anchor: 'head',
    size: [110, 110],
    pivot: [55, 55],
    offset: [80, 50],
    tileCrop: 'head',
  },
  flowerClip: {
    prompt:
      'a small lilac flower hair clip with a yellow centre and a short clip bar, seen from the front',
    preset: 'sol-med',
    anchor: 'head',
    size: [110, 110],
    pivot: [55, 55],
    offset: [80, 50],
    tileCrop: 'head',
  },
  bowHeadband: {
    prompt:
      "a pink fabric headband with a big bow on top, seen from the front as it sits on the top of a child's head, the band curving down at both ends",
    preset: 'sol-med',
    anchor: 'head',
    size: [300, 150],
    pivot: [150, 105],
    tileCrop: 'head',
  },
  rocketBackpack: {
    prompt:
      'a toy rocket backpack seen from the front as it shows behind the shoulders of a child: a chubby white and coral rocket with a lavender nose cone, a round window and two small fins, with two lavender straps',
    preset: 'sol-med',
    anchor: 'back',
    size: [360, 440],
    pivot: [180, 220],
    tileCrop: 'torso',
  },
};

/** Sound effects (SPEC §15.4), synthesized by tools/gen-sounds.ts into assets/<theme>/sound/. */
export const SOUNDS: { id: string; theme: AssetEntry['theme']; label: string }[] = [
  { id: 'shared/sound/tap', theme: 'shared', label: 'Tap' },
  { id: 'shared/sound/place', theme: 'shared', label: 'Place a decoration' },
  { id: 'shared/sound/wear', theme: 'shared', label: 'Wear a garment' },
  { id: 'shared/sound/correct', theme: 'shared', label: 'Correct answer' },
  { id: 'shared/sound/wrong', theme: 'shared', label: 'Wrong answer (soft)' },
  { id: 'shared/sound/hint', theme: 'shared', label: 'Hint' },
  { id: 'shared/sound/next', theme: 'shared', label: 'Next puzzle' },
  { id: 'shared/sound/fanfare', theme: 'shared', label: 'Mission complete fanfare' },
  { id: 'space/sound/jingle', theme: 'space', label: 'Launch jingle' },
  { id: 'sweet/sound/jingle', theme: 'sweet', label: 'Tea-party jingle' },
  { id: 'shared/sound/star', theme: 'shared', label: 'Star earned' },
];

type Extra = Omit<AssetEntry, 'path'> & {
  id: string;
  prompt?: string;
  preset?: GenPreset;
  references?: string[];
};

const gen = (preset: GenPreset, prompt: string, references: string[]) => ({
  preset,
  prompt,
  references,
});

/** Non-catalogue assets (SPEC §15.3). */
export const EXTRA_ASSETS: Extra[] = [
  // Rooms
  {
    id: 'space/room/background',
    theme: 'space',
    category: 'room',
    size: [3072, 2048],
    label: 'Space room background',
    ...gen(
      'astra-light',
      "the child's bedroom from the attached concept image, redrawn as an empty room in the same layout, palette and painterly cosy style: warm peach walls dotted with small pastel stars and tiny planets, a big arched window on the right third showing a deep purple night sky with a ringed planet, a blue planet and stars, a warm honey wooden plank floor, a low wooden bookshelf with books and a potted plant at the far left, a small wall shelf with a plant and books at the upper left, trailing green leaves, a small nightstand under the window, a large open floor space in the centre; the centre wall must be blank (no poster, no shelf, no hook art) and the room must contain no bed, no rug, no lamp, no poster, no toy on the shelf, no mobile, no cushion, no beanbag and no character; keep the floor centre and the right half of the floor clear",
      [SPACE_REF],
    ),
  },
  {
    id: 'sweet/room/background',
    theme: 'sweet',
    category: 'room',
    size: [3072, 2048],
    label: 'Sweet room background',
    ...gen(
      'astra-light',
      'the pastel playroom from the attached concept image, redrawn as an empty room in the same layout, palette and painterly cosy style: warm peach walls, a tall mint-green open shelf unit with a few books and a small framed picture at the far left with trailing green ivy on top, a big arched window on the upper right showing a sunny sky, a smiling sun, distant houses and a hedge, a pale honey wooden floor, a small mint cabinet under the window, a low white skirting board, a large open floor space in the centre; the centre wall must be blank (no poster, no banner, no hook art) and the room must contain no bed, no rug, no lamp, no poster, no toy on the shelf, no mobile, no cushion, no window seat and no character or cat; keep the floor centre and the right half of the floor clear',
      [SWEET_REF],
    ),
  },
  // Heroine reference sheet (SPEC §15.2 item 2): the figures, faces, shoes and extras below
  // are generated with it attached so they stay the same girl.
  {
    id: HEROINE_SHEET,
    theme: 'shared',
    category: 'heroine',
    size: [2400, 1600],
    label: 'Heroine reference sheet',
    ...gen(
      'astra-light',
      'a character reference sheet of one seven-year-old girl heroine, brown hair in two buns, lilac planet tee, mint skirt, yellow socks, white sneakers: front view standing, then the same face with neutral, happy, thinking and cheering expressions, then the head with three hair styles: two buns, high ponytail, loose with a clip',
      [SPACE_REF],
    ),
  },
  ...FACES.map(([name, expression]): Extra => ({
    id: `shared/heroine/face/${name}`,
    theme: 'shared',
    category: 'heroine',
    size: FACE_SIZE,
    pivot: [FACE_SIZE[0] / 2, FACE_SIZE[1] / 2],
    layer: 'face',
    anchor: 'face',
    label: `Face ${name}`,
    ...gen(
      'astra-light',
      `only the face of the exact same seven-year-old girl from the attached reference sheet with the ${expression}, matching the top row of the sheet: her eyes, eyebrows, small nose, pink blush and mouth painted on a flat oval patch of her exact skin colour, front view, at the same scale as the sheet's heads; no hair, no ears, no neck, no hands, no outline around the patch`,
      [HEROINE_SHEET],
    ),
  })),
  // Companions: idle, cheer, hmm, special
  ...(['idle', 'cheer', 'hmm', 'special'] as const).map((pose): Extra => ({
    id: `space/companion/pip/${pose}`,
    theme: 'space',
    category: 'companion',
    size: [400, 480],
    label: `Pip ${pose}`,
    ...gen(
      'astra-light',
      `a small friendly turquoise alien with one antenna topped by a star, ${
        {
          idle: 'standing and smiling',
          cheer: 'jumping with both arms up, cheering',
          hmm: 'tilting its head with a puzzled friendly "hmm" look',
          special: 'spinning with a giggle, motion lines',
        }[pose]
      }`,
      [SPACE_REF, 'space/companion/pip/idle'],
    ),
  })),
  ...(['idle', 'cheer', 'hmm', 'special'] as const).map((pose): Extra => ({
    id: `sweet/companion/mimi/${pose}`,
    theme: 'sweet',
    category: 'companion',
    size: [400, 480],
    label: `Mimi ${pose}`,
    ...gen(
      'astra-light',
      `a small friendly grey-and-white cat with a yellow bandana, ${
        {
          idle: 'sitting and smiling',
          cheer: 'standing on hind legs with paws up, cheering',
          hmm: 'tilting its head with a puzzled friendly "hmm" look',
          special: 'stretching and purring with little hearts',
        }[pose]
      }`,
      [SWEET_REF, 'sweet/companion/mimi/idle'],
    ),
  })),
  // Mission entry objects
  {
    id: 'space/entry/toyRocket',
    theme: 'space',
    category: 'entry',
    size: [320, 400],
    pivot: [160, 400],
    label: 'Toy rocket',
    ...gen(
      'astra-light',
      'a chunky toy rocket standing on three fins, white and coral with a round window and a lavender nose cone',
      [SPACE_REF],
    ),
  },
  {
    id: 'space/entry/toyRocketReaction',
    theme: 'space',
    category: 'entry',
    size: [320, 400],
    pivot: [160, 400],
    label: 'Toy rocket reacting',
    ...gen(
      'astra-light',
      'the same chunky toy rocket wobbling with small smoke puffs at its base and its round window glowing yellow',
      [SPACE_REF, 'space/entry/toyRocket'],
    ),
  },
  {
    id: 'sweet/entry/toyLetterbox',
    theme: 'sweet',
    category: 'entry',
    size: [240, 300],
    pivot: [120, 300],
    label: 'Toy letterbox',
    ...gen('sol-med', 'a small toy letterbox on a short post, pastel pink with a mint flag down', [
      SWEET_REF,
    ]),
  },
  {
    id: 'sweet/entry/toyLetterboxFlag',
    theme: 'sweet',
    category: 'entry',
    size: [240, 300],
    pivot: [120, 300],
    label: 'Toy letterbox flag up',
    ...gen(
      'sol-med',
      'the same small toy letterbox with its mint flag raised and a tiny envelope popping out',
      [SWEET_REF, 'sweet/entry/toyLetterbox'],
    ),
  },
  // Activity A scene art
  {
    id: 'space/sceneA/cockpitFrame',
    theme: 'space',
    category: 'sceneA',
    size: [3072, 2048],
    label: 'Cockpit frame',
    ...gen(
      'astra-light',
      'the inside of a friendly purple spaceship cockpit seen from the pilot seat, with a large empty light rectangular panel in the centre, dials and buttons around the edges and stars through the window',
      [SPACE_REF],
    ),
  },
  {
    id: 'space/sceneA/rocket',
    theme: 'space',
    category: 'sceneA',
    size: [600, 900],
    pivot: [300, 900],
    label: 'Rocket on the pad',
    ...gen(
      'astra-light',
      'a friendly cartoon rocket standing on a launch pad, white and coral with a lavender nose cone and three fins',
      [SPACE_REF],
    ),
  },
  {
    id: 'space/sceneA/launchFlame',
    theme: 'space',
    category: 'sceneA',
    size: [400, 500],
    pivot: [200, 0],
    label: 'Launch flame',
    ...gen(
      'astra-light',
      'a bright cartoon rocket exhaust flame with yellow, orange and coral layers and small smoke puffs',
      [SPACE_REF],
    ),
  },
  ...(
    [
      ['fuel', 'a small red fuel canister with a hose'],
      ['hatch', 'a round rocket hatch door with a porthole window'],
      ['lights', 'a row of three glowing runway lights'],
      ['countdown', 'a small display board showing large empty digits'],
    ] as const
  ).map(([step, prompt]): Extra => ({
    id: `space/sceneA/step/${step}`,
    theme: 'space',
    category: 'sceneA',
    size: [300, 300],
    label: `Step ${step}`,
    ...gen('sol-med', prompt, [SPACE_REF]),
  })),
  {
    id: 'sweet/sceneA/kitchenFrame',
    theme: 'sweet',
    category: 'sceneA',
    size: [3072, 2048],
    label: 'Kitchen frame',
    ...gen(
      'astra-light',
      'a cosy pastel toy kitchen wall with a window, shelves of cups and a large empty light rectangular panel in the centre',
      [SWEET_REF],
    ),
  },
  {
    id: 'sweet/sceneA/teaTable',
    theme: 'sweet',
    category: 'sceneA',
    size: [1200, 700],
    pivot: [600, 700],
    label: 'Tea table',
    ...gen(
      'astra-light',
      'a small round tea-party table with a pink cloth, a teapot, cups and a cake, with a few stuffed toys sitting around it',
      [SWEET_REF],
    ),
  },
  ...(
    [
      ['cups', 'three small pastel teacups on saucers'],
      ['cake', 'a small round strawberry cake on a plate'],
      ['teapot', 'a round mint teapot with a flower on the lid'],
      ['guests', 'two small plush toys, a bear and a bunny, sitting side by side'],
    ] as const
  ).map(([step, prompt]): Extra => ({
    id: `sweet/sceneA/step/${step}`,
    theme: 'sweet',
    category: 'sceneA',
    size: [300, 300],
    label: `Step ${step}`,
    ...gen('sol-med', prompt, [SWEET_REF]),
  })),
  // Activity B scene art
  {
    id: 'space/sceneB/planet',
    theme: 'space',
    category: 'sceneB',
    size: [400, 400],
    label: 'Origin planet',
    ...gen('sol-med', 'a small round lavender planet with a pale ring', [SPACE_REF]),
  },
  {
    id: 'space/sceneB/moon',
    theme: 'space',
    category: 'sceneB',
    size: [400, 400],
    label: 'Destination moon',
    ...gen('sol-med', 'a small round pale yellow moon with three soft craters', [SPACE_REF]),
  },
  {
    id: 'space/sceneB/rocketParcel',
    theme: 'space',
    category: 'sceneB',
    size: [600, 400],
    label: 'Rocket carrying a parcel',
    ...gen(
      'astra-light',
      'a small friendly rocket flying sideways carrying a wrapped parcel with a bow under its belly, tiny flame behind',
      [SPACE_REF],
    ),
  },
  {
    id: 'sweet/sceneB/toyShop',
    theme: 'sweet',
    category: 'sceneB',
    size: [600, 500],
    label: 'Toy shop',
    ...gen('sol-med', 'a small pastel toy shop front with a striped awning and a round sign', [
      SWEET_REF,
    ]),
  },
  {
    id: 'sweet/sceneB/window',
    theme: 'sweet',
    category: 'sceneB',
    size: [600, 500],
    label: 'Playroom window',
    ...gen('sol-med', 'a playroom window with mint curtains seen from outside, flower box below', [
      SWEET_REF,
    ]),
  },
  {
    id: 'sweet/sceneB/balloonParcel',
    theme: 'sweet',
    category: 'sceneB',
    size: [600, 700],
    label: 'Balloon parcel with cat courier',
    ...gen(
      'astra-light',
      'a wrapped parcel with a bow carried by three pastel balloons, with a small grey-and-white cat in a yellow bandana riding on top',
      [SWEET_REF, 'sweet/companion/mimi/idle'],
    ),
  },
  {
    id: 'shared/sceneB/parcel',
    theme: 'shared',
    category: 'sceneB',
    size: [240, 240],
    label: 'Parcel',
    ...gen('sol-med', 'a small wrapped parcel in kraft paper with a coral bow', [SPACE_REF]),
  },
  // UI
  {
    id: 'shared/ui/starChart',
    theme: 'shared',
    category: 'ui',
    size: [600, 400],
    label: 'Star chart poster',
    source: 'hand-drawn',
  },
  {
    id: 'shared/ui/logo',
    theme: 'shared',
    category: 'logo',
    size: [1200, 400],
    label: 'Title logo',
    ...gen(
      'astra-light',
      'a title logo for a children\'s clock game: the single word "Tick-Tock" (exactly that spelling, with the hyphen, and no other words) in playful rounded chunky children\'s-game lettering, lavender letters with coral accents, a small friendly clock face tucked into the lettering as the only extra motif, on plain white',
      [SPACE_REF],
    ),
  },
];
