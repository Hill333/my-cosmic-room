import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SlotType, Theme } from '../core/types.ts';
import type { StageBox } from '../catalog/slots.ts';
import type { RestSpot } from '../catalog/types.ts';
import {
  clampToFloor,
  COMPANION_SPEED,
  facingOf,
  FOLLOW_DELAY_MS,
  followPoint,
  HEROINE_SPEED,
  type HeroinePose,
  homePoints,
  KEY_STEP,
  type Point,
  STAND_MS,
  standPointFor,
  walkMs,
} from '../catalog/walk.ts';
import { motion } from '../state/store.ts';

/** A rest in progress: the item the heroine lies or sits on and where she stands up to. */
export interface Resting {
  slot: SlotType;
  box: StageBox;
  spot: RestSpot;
  standAt: Point;
}

export interface WalkState {
  heroineAt: Point;
  companionAt: Point;
  pose: HeroinePose;
  resting: Resting | null;
  /** The heroine is picked (SPEC §4.3): the next click on the floor or an item sends her there. */
  selected: boolean;
  walking: boolean;
  companionWalking: boolean;
  facing: 1 | -1;
  companionFacing: 1 | -1;
  walkMs: number;
  companionWalkMs: number;
}

export interface RoomWalk extends WalkState {
  /** Click on the heroine: picks her, or stands her up when she rests. */
  toggleSelected: () => void;
  deselect: () => void;
  /** Walks to a floor point (clamped); `then` runs on arrival. */
  walkTo: (p: Point, then?: () => void) => void;
  /** Walks to an item's box and, for a bed or nook, lies or sits on it; `then` runs on arrival. */
  goToSlot: (slot: SlotType, box: StageBox, rest: RestSpot | undefined, then?: () => void) => void;
  /** Gets up (and forgets the selection); a no-op when standing. */
  standUp: () => void;
  /** Arrow-key walking while selected (SPEC §13.1); true when the key was used. */
  onKey: (e: KeyboardEvent) => boolean;
}

function initial(theme: Theme): WalkState {
  const home = homePoints(theme);
  return {
    heroineAt: home.heroine,
    companionAt: home.companion,
    pose: 'stand',
    resting: null,
    selected: false,
    walking: false,
    companionWalking: false,
    facing: 1,
    companionFacing: 1,
    walkMs: 0,
    companionWalkMs: 0,
  };
}

function reducedMotion(): boolean {
  const setting = motion.value;
  if (setting === 'reduced') return true;
  if (setting === 'full') return false;
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The heroine's free-play walking (SPEC §4.3): pick her, click the floor or an item and she
 * walks there, lies down in the bed or sits in the nook; the companion trots after her. All
 * of it is UI state on S1 (nothing reaches the save); positions are feet points in stage
 * px, the CSS moves the boxes with a transition of `walkMs` and arrival is a timer, so under
 * reduced motion (duration 0) every state change lands at once.
 */
export function useRoomWalk(theme: Theme): RoomWalk {
  const [state, setState] = useState<WalkState>(() => initial(theme));
  const stateRef = useRef(state);
  stateRef.current = state;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
  }, []);
  const clearTimers = useCallback(() => {
    for (const id of timers.current) clearTimeout(id);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  // A theme change (S0 → the other room) starts both walkers at home again.
  const themeRef = useRef(theme);
  useEffect(() => {
    if (themeRef.current === theme) return;
    themeRef.current = theme;
    clearTimers();
    setState(initial(theme));
  }, [theme, clearTimers]);

  const follow = useCallback(
    (target: Point) => {
      later(() => {
        const s = stateRef.current;
        const to = followPoint(theme, target, s.companionAt);
        const ms = walkMs(s.companionAt, to, COMPANION_SPEED, reducedMotion());
        setState((c) => ({
          ...c,
          companionAt: to,
          companionWalking: ms > 0,
          companionWalkMs: ms,
          companionFacing: facingOf(c.companionAt, to, c.companionFacing),
        }));
        if (ms > 0) later(() => setState((c) => ({ ...c, companionWalking: false })), ms);
      }, FOLLOW_DELAY_MS);
    },
    [theme, later],
  );

  /** The walk itself, from wherever she stands now. */
  const startWalk = useCallback(
    (to: Point, then?: () => void) => {
      const s = stateRef.current;
      const ms = walkMs(s.heroineAt, to, HEROINE_SPEED, reducedMotion());
      setState((c) => ({
        ...c,
        heroineAt: to,
        pose: 'stand',
        resting: null,
        selected: false,
        walking: ms > 0,
        walkMs: ms,
        facing: facingOf(c.heroineAt, to, c.facing),
      }));
      follow(to);
      later(() => {
        setState((c) => ({ ...c, walking: false }));
        then?.();
      }, ms);
    },
    [follow, later],
  );

  const standUp = useCallback(() => {
    const s = stateRef.current;
    if (s.pose === 'stand' || !s.resting) return;
    const ms = reducedMotion() ? 0 : STAND_MS;
    setState((c) => ({
      ...c,
      heroineAt: c.resting?.standAt ?? c.heroineAt,
      pose: 'stand',
      resting: null,
      selected: false,
      walking: false,
      walkMs: ms,
      facing: 1,
    }));
  }, []);

  const walkTo = useCallback(
    (p: Point, then?: () => void) => {
      clearTimers();
      const to = clampToFloor(theme, p);
      if (stateRef.current.pose !== 'stand') {
        // Out of the bed or the nook first, then off.
        standUp();
        later(() => startWalk(to, then), reducedMotion() ? 0 : STAND_MS);
      } else startWalk(to, then);
    },
    [theme, clearTimers, standUp, later, startWalk],
  );

  const goToSlot = useCallback(
    (slot: SlotType, box: StageBox, rest: RestSpot | undefined, then?: () => void) => {
      const standAt = standPointFor(theme, slot, box, stateRef.current.heroineAt);
      const pose: HeroinePose | null = slot === 'BED' ? 'bed' : slot === 'NOOK' ? 'sit' : null;
      walkTo(standAt, () => {
        if (pose && rest) {
          setState((c) => ({
            ...c,
            pose,
            resting: { slot, box, spot: rest, standAt },
            selected: false,
            walkMs: reducedMotion() ? 0 : STAND_MS,
            facing: 1,
          }));
        }
        then?.();
      });
    },
    [theme, walkTo],
  );

  const toggleSelected = useCallback(() => {
    const s = stateRef.current;
    if (s.pose !== 'stand') {
      clearTimers();
      standUp();
      return;
    }
    setState((c) => ({ ...c, selected: !c.selected }));
  }, [clearTimers, standUp]);

  const deselect = useCallback(() => {
    setState((c) => (c.selected ? { ...c, selected: false } : c));
  }, []);

  const onKey = useCallback(
    (e: KeyboardEvent): boolean => {
      const s = stateRef.current;
      if (!s.selected || s.walking) return false;
      const step: Record<string, [number, number]> = {
        ArrowLeft: [-KEY_STEP, 0],
        ArrowRight: [KEY_STEP, 0],
        ArrowUp: [0, -KEY_STEP / 2],
        ArrowDown: [0, KEY_STEP / 2],
      };
      const d = step[e.key];
      if (!d) return false;
      walkTo({ x: s.heroineAt.x + d[0], y: s.heroineAt.y + d[1] }, () =>
        setState((c) => ({ ...c, selected: true })),
      );
      return true;
    },
    [walkTo],
  );

  return { ...state, toggleSelected, deselect, walkTo, goToSlot, standUp, onKey };
}
