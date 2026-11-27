import type { LiveActivity, LiveActivityFactory } from "expo-widgets";

// Live Activities are iOS only (timer-activity.ios.tsx). Elsewhere there are none,
// and @expo/ui's SwiftUI views must not load at all.

export type TimerActivityProps = {
  label: string;
  recipe?: string;
  /** Start of the countdown (end minus its length), ms since epoch. */
  from: number;
  /** End, ms since epoch. */
  to: number;
  /** Set while paused, e.g. "4:32". */
  paused?: string;
};

export function timerActivities(): LiveActivityFactory<TimerActivityProps> | null {
  return null;
}

export type { LiveActivity };
