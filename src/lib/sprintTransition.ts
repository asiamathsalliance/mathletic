/** Sprint session-end → results reveal timing (ms). */
export const SPRINT_EXIT_MS = 200;
export const SPRINT_HELD_MS = 575;
export const SPRINT_RESULTS_FRAME_MS = 250;
export const SPRINT_REEL_DURATION_MS = 1000;
export const SPRINT_REEL_STAGGER_MS = 175;
export const SPRINT_ACHIEVEMENT_PAUSE_MS = 150;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
