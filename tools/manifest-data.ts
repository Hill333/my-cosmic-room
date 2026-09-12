/**
 * Source data for assets/manifest.json: sizes per slot, generation prompts and the
 * non-catalogue assets from SPEC §15.3. Prompts are one sentence; the style block is
 * added by tools/gen-assets.ts (SPEC §15.6).
 */
import type { AssetEntry, GenPreset } from '../src/assetTypes.ts';
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

export const TILE_SIZE: [number, number] = [360, 360];
export const HEROINE_CANVAS: [number, number] = [600, 900];

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
      "a cosy child's bedroom in peach, lavender and mint with a round window showing stars and planets, a nightstand, a shelf and a ceiling hook; empty room, no bed, rug, lamp, poster, shelf toy, mobile or cushion; keep the floor centre clear for a standing character",
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
      "a cosy child's playroom in peach and mint with flower wallpaper, a window with a sunny garden, a nightstand, a shelf and a ceiling hook; empty room, no bed, rug, lamp, poster, shelf toy, mobile or cushion; keep the floor centre clear for a standing character",
      [SWEET_REF],
    ),
  },
  // Heroine (vector, traced from one generated reference sheet)
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
  {
    id: 'shared/heroine/body',
    theme: 'shared',
    category: 'heroine',
    size: HEROINE_CANVAS,
    layer: 'body',
    label: 'Heroine body',
    source: 'hand-drawn',
  },
  {
    id: 'shared/heroine/face/neutral',
    theme: 'shared',
    category: 'heroine',
    size: [300, 200],
    layer: 'face',
    label: 'Face neutral',
    source: 'hand-drawn',
  },
  {
    id: 'shared/heroine/face/happy',
    theme: 'shared',
    category: 'heroine',
    size: [300, 200],
    layer: 'face',
    label: 'Face happy',
    source: 'hand-drawn',
  },
  {
    id: 'shared/heroine/face/thinking',
    theme: 'shared',
    category: 'heroine',
    size: [300, 200],
    layer: 'face',
    label: 'Face thinking',
    source: 'hand-drawn',
  },
  {
    id: 'shared/heroine/face/cheering',
    theme: 'shared',
    category: 'heroine',
    size: [300, 200],
    layer: 'face',
    label: 'Face cheering',
    source: 'hand-drawn',
  },
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
      'a playful rounded title logo reading "My Cosmic Room" in chunky friendly letters, lavender and coral with a small star and moon, on plain white',
      [SPACE_REF],
    ),
  },
];
