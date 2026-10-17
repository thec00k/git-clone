import {smootherstep} from './workbench.ts';
/** Shared response rates; cap tab-resume deltas so objects cannot jump through space. */
export const MOTION = {furniture: 7, drawer: 8, light: 3, atmosphere: 2, printMs: 1800} as const;
export function motionFactor(delta: number, response: number, reduced = false) {
  return reduced ? 1 : 1 - Math.exp(-Math.max(0, Math.min(delta, 0.05)) * response);
}

/** Time-based moves (see docs/motion-guide.md). Feedback 150 ms, panels 300 to 420 ms, camera 650 ms, page turn 820 to 950 ms. */
export const CAMERA_MOVE_SECONDS = 0.65;
/** Same smooth-ends curve as the 3D page turn: gentle start, gentle landing, no overshoot. */
export const cameraMoveEase = smootherstep;
