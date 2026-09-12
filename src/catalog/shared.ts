import type { Item } from './types.ts';

/**
 * Shared heroine starter wardrobe (SPEC §4.4): 3 hair, 3 outfits, 2 shoes, 0 extras.
 * Hair and garments are SVG groups on the heroine template (SPEC §4.5, §15.2).
 */
export const sharedItems: Item[] = [
  {
    id: 'shared.hairBuns',
    theme: 'shared',
    kind: 'hair',
    order: 0,
    starter: true,
    nameKey: 'item.shared.hairBuns',
    art: { tile: 'shared/tiles/hairBuns', heroineLayer: 'shared/heroine/hair/buns' },
  },
  {
    id: 'shared.hairPonytail',
    theme: 'shared',
    kind: 'hair',
    order: 1,
    starter: true,
    nameKey: 'item.shared.hairPonytail',
    art: { tile: 'shared/tiles/hairPonytail', heroineLayer: 'shared/heroine/hair/ponytail' },
  },
  {
    id: 'shared.hairLoose',
    theme: 'shared',
    kind: 'hair',
    order: 2,
    starter: true,
    nameKey: 'item.shared.hairLoose',
    art: { tile: 'shared/tiles/hairLoose', heroineLayer: 'shared/heroine/hair/loose' },
  },
  {
    id: 'shared.outfitPlanetTee',
    theme: 'shared',
    kind: 'outfit',
    order: 0,
    starter: true,
    nameKey: 'item.shared.outfitPlanetTee',
    art: { tile: 'shared/tiles/outfitPlanetTee', heroineLayer: 'shared/heroine/outfit/planetTee' },
  },
  {
    id: 'shared.outfitFloralSweater',
    theme: 'shared',
    kind: 'outfit',
    order: 1,
    starter: true,
    nameKey: 'item.shared.outfitFloralSweater',
    art: {
      tile: 'shared/tiles/outfitFloralSweater',
      heroineLayer: 'shared/heroine/outfit/floralSweater',
    },
  },
  {
    id: 'shared.outfitStarHoodie',
    theme: 'shared',
    kind: 'outfit',
    order: 2,
    starter: true,
    nameKey: 'item.shared.outfitStarHoodie',
    art: {
      tile: 'shared/tiles/outfitStarHoodie',
      heroineLayer: 'shared/heroine/outfit/starHoodie',
    },
  },
  {
    id: 'shared.shoesSneakers',
    theme: 'shared',
    kind: 'shoes',
    order: 0,
    starter: true,
    nameKey: 'item.shared.shoesSneakers',
    art: { tile: 'shared/tiles/shoesSneakers', heroineLayer: 'shared/heroine/shoes/sneakers' },
  },
  {
    id: 'shared.shoesMaryJanes',
    theme: 'shared',
    kind: 'shoes',
    order: 1,
    starter: true,
    nameKey: 'item.shared.shoesMaryJanes',
    art: { tile: 'shared/tiles/shoesMaryJanes', heroineLayer: 'shared/heroine/shoes/maryJanes' },
  },
];

/** Default heroine look on a fresh save (SPEC §4.4 defaults). */
export const defaultHeroine = {
  hair: 'shared.hairBuns',
  outfit: 'shared.outfitPlanetTee',
  shoes: 'shared.shoesSneakers',
  extra: null,
} as const;
