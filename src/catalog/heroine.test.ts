import { describe, expect, it } from 'vitest';
import manifestJson from '../../assets/manifest.json';
import type { AssetEntry, AssetManifest } from '../assetTypes.ts';
import {
  ANKLE_CLIP_OVERLAP,
  ANKLE_CUFF,
  FALLBACK_ANCHORS,
  overlayBox,
  overlayClipTop,
  overlayParts,
  overlayStyles,
} from './heroine.ts';
import { allItems, defaultHeroine, figureId, heroineFigure, requireItem } from './index.ts';
import { THEMES } from '../core/types.ts';

const manifest = manifestJson as unknown as AssetManifest;

describe('heroine figures and overlays (SPEC §4.5)', () => {
  it('names one figure per outfit × hairstyle and the manifest has all 33 with anchors', () => {
    const outfits = allItems.filter((i) => i.kind === 'outfit');
    const hairs = allItems.filter((i) => i.kind === 'hair');
    // 3 shared starters + 2 earnable outfits per room (D21).
    expect(outfits).toHaveLength(3 + 2 * THEMES.length);
    expect(hairs).toHaveLength(3);
    for (const o of outfits) {
      for (const h of hairs) {
        const id = heroineFigure(o.id, h.id);
        expect(id).toBe(figureId(o.art.figure!, h.art.figure!));
        const entry = manifest.assets[id];
        expect(entry, id).toBeDefined();
        expect(entry!.layer).toBe('figure');
        expect(entry!.size).toEqual([600, 900]);
        for (const kind of ['face', 'feet', 'head', 'back'] as const) {
          const a = entry!.anchors?.[kind];
          expect(a, `${id} ${kind}`).toBeDefined();
          expect(a!.scale).toBeGreaterThan(0);
          expect(a!.x).toBeGreaterThanOrEqual(0);
          expect(a!.x).toBeLessThanOrEqual(600);
          expect(a!.y).toBeGreaterThanOrEqual(0);
          expect(a!.y).toBeLessThanOrEqual(900);
        }
      }
    }
    expect(heroineFigure(defaultHeroine.outfit, defaultHeroine.hair)).toBe(
      'shared/heroine/figure/planetTee-buns',
    );
  });

  it('shoes and extras are overlays with an anchor and a pivot; faces snap to the face', () => {
    for (const item of allItems.filter((i) => i.kind === 'shoes' || i.kind === 'extra')) {
      const entry = manifest.assets[item.art.heroineLayer!];
      expect(entry, item.id).toBeDefined();
      expect(entry!.layer).toBe(item.kind);
      expect(entry!.anchor).toBe(item.kind === 'shoes' ? 'feet' : entry!.anchor);
      expect(['face', 'feet', 'head', 'back']).toContain(entry!.anchor);
      expect(entry!.pivot).toBeDefined();
      const tile = manifest.assets[item.art.tile];
      expect(tile?.derivedFrom).toBe(item.art.heroineLayer);
      expect(tile?.tileCrop).toBeDefined();
    }
    expect(requireItem('space.rocketBackpack').art.heroineLayer).toBe(
      'shared/heroine/extra/rocketBackpack',
    );
    expect(manifest.assets['shared/heroine/extra/rocketBackpack']!.anchor).toBe('back');
    for (const face of ['happy', 'thinking', 'cheering']) {
      const entry = manifest.assets[`shared/heroine/face/${face}`];
      expect(entry?.layer).toBe('face');
      expect(entry?.anchor).toBe('face');
    }
    expect(manifest.assets['shared/heroine/face/neutral']).toBeUndefined();
  });

  it('outfit and hair tiles are cropped views of a figure', () => {
    for (const item of allItems.filter((i) => i.kind === 'outfit' || i.kind === 'hair')) {
      const tile = manifest.assets[item.art.tile]!;
      expect(tile.derivedFrom).toMatch(/^shared\/heroine\/figure\//);
      expect(tile.tileCrop).toBe(item.kind === 'outfit' ? 'torso' : 'head');
      expect(manifest.assets[tile.derivedFrom!]).toBeDefined();
    }
  });

  it('places an overlay by its pivot on the anchor, scaled and offset', () => {
    const shoes = { size: [300, 200] as [number, number], pivot: [150, 200] as [number, number] };
    expect(overlayBox({ x: 300, y: 900, scale: 1 }, shoes)).toEqual({
      left: 150,
      top: 700,
      width: 300,
      height: 200,
    });
    expect(overlayBox({ x: 300, y: 900, scale: 0.5 }, shoes)).toEqual({
      left: 225,
      top: 800,
      width: 150,
      height: 100,
    });
    const clip = {
      size: [110, 110] as [number, number],
      pivot: [55, 55] as [number, number],
      offset: [78, 36] as [number, number],
    };
    expect(overlayBox({ x: 300, y: 70, scale: 1 }, clip)).toEqual({
      left: 323,
      top: 51,
      width: 110,
      height: 110,
    });
    // Without a pivot the overlay is centred on the anchor.
    expect(overlayBox({ x: 100, y: 100, scale: 2 }, { size: [50, 30] })).toEqual({
      left: 50,
      top: 70,
      width: 100,
      height: 60,
    });
  });

  it('expresses the box as percentages of the figure canvas', () => {
    const parts = overlayStyles([600, 900], FALLBACK_ANCHORS.feet, {
      size: [300, 200],
      pivot: [150, 200],
    });
    expect(parts).toEqual([
      { style: { left: '30.500%', top: '82.111%', width: '39.000%', height: '17.333%' } },
    ]);
  });

  it('clips a clipAtAnkle shoe just above the figure ankle cut, with a cuff outline under the line', () => {
    const shoes: Pick<AssetEntry, 'size' | 'pivot' | 'clipAtAnkle'> = {
      size: [300, 200],
      pivot: [150, 200],
    };
    const feet = { x: 300, y: 900, scale: 1, cutY: 800 };
    // Not clipped without the flag or without a cut on the figure.
    expect(overlayClipTop(feet, shoes)).toBeNull();
    expect(
      overlayClipTop({ x: 300, y: 900, scale: 1 }, { ...shoes, clipAtAnkle: true }),
    ).toBeNull();
    expect(overlayStyles([600, 900], feet, shoes)[0]).toEqual({
      style: { left: '25.000%', top: '77.778%', width: '50.000%', height: '22.222%' },
    });
    // Clipped: the box spans 700..900, the clip line is 800 - overlap → 44% of the box; the
    // cuff band is the next ANKLE_CUFF px (1.5% of the 200 px box).
    const clipped = { ...shoes, clipAtAnkle: true };
    expect(overlayClipTop(feet, clipped)).toBe(800 - ANKLE_CLIP_OVERLAP);
    const [part] = overlayStyles([600, 900], feet, clipped);
    expect(part!.style.clipPath).toBe('inset(44.000% 0.000% 0.000% 0.000%)');
    expect(part!.cuff!.clipPath).toBe(
      `inset(44.000% 0.000% ${(56 - ANKLE_CUFF / 2).toFixed(3)}% 0.000%)`,
    );
    expect(part!.cuff!.left).toBe(part!.style.left);
    // A cut above the box needs no clip and no cuff.
    const above = overlayStyles([600, 900], { ...feet, cutY: 600 }, clipped)[0]!;
    expect(above.style.clipPath).toBeUndefined();
    expect(above.cuff).toBeUndefined();
  });

  it('draws a shoe with footX as two halves, each moved onto its leg (legX)', () => {
    const shoes: Pick<AssetEntry, 'size' | 'pivot' | 'clipAtAnkle' | 'footX'> = {
      size: [300, 200],
      pivot: [150, 200],
      footX: [75, 225],
    };
    // Without legX on the figure the pair stays whole.
    expect(overlayParts({ x: 300, y: 900, scale: 1 }, shoes)).toHaveLength(1);
    // Legs at 220 and 380, feet at 150 + 75 = 225 and 375 → each half moves 5 px outwards.
    const feet = { x: 300, y: 900, scale: 1, cutY: 800, legX: [220, 380] as [number, number] };
    const parts = overlayParts(feet, shoes);
    expect(parts.map((p) => [p.half, p.box.left, p.box.top])).toEqual([
      ['left', 145, 700],
      ['right', 155, 700],
    ]);
    // Half a box each, split at the pivot column; the ankle clip stacks with it.
    const styles = overlayStyles([600, 900], feet, { ...shoes, clipAtAnkle: true });
    expect(styles.map((p) => p.style.clipPath)).toEqual([
      'inset(44.000% 50.000% 0.000% 0.000%)',
      'inset(44.000% 0.000% 0.000% 50.000%)',
    ]);
    expect(styles.map((p) => p.style.left)).toEqual(['24.167%', '25.833%']);
    // At half scale the feet move half as far from the box's left edge.
    expect(overlayParts({ ...feet, scale: 0.5 }, shoes).map((p) => p.box.left)).toEqual([
      182.5, 267.5,
    ]);
  });

  it('every generated figure carries an ankle cut above the soles; socks and boots are clipped', () => {
    for (const [id, entry] of Object.entries(manifest.assets)) {
      if (entry.layer !== 'figure' || !entry.path.endsWith('.png')) continue;
      const feet = entry.anchors!.feet;
      expect(feet.cutY, id).toBeDefined();
      expect(feet.cutY!, id).toBeLessThan(feet.y);
      expect(feet.cutY!, id).toBeGreaterThan(feet.y - 200);
    }
    const clipped = (name: string) => manifest.assets[`shared/heroine/shoes/${name}`]!.clipAtAnkle;
    expect(clipped('sneakers')).toBe(true);
    expect(clipped('maryJanes')).toBe(true);
    expect(clipped('rainbowSandals')).toBe(true);
    expect(clipped('spaceBoots')).toBe(true);
    expect(clipped('bunnySlippers')).toBeUndefined();
    expect(clipped('catSlippers')).toBeUndefined();
  });
});
