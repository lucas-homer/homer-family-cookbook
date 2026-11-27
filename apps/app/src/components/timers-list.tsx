import * as React from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { Button, SwipeRow, Text, TimerBar, TimerRow } from "@/components/ui";
import { secondsLeft, useNow, useTimers, type Timer } from "@/lib/timers";

/** Soonest-ending first; paused ones after running ones. */
export function sortTimers(timers: Timer[], now: number) {
  return [...timers].sort((a, b) => {
    if ((a.endsAt === null) !== (b.endsAt === null)) return a.endsAt === null ? 1 : -1;
    return secondsLeft(a, now) - secondsLeft(b, now);
  });
}

/**
 * Every timer, with their countdowns. Tap to pause or resume, swipe left to
 * end, swipe right to add a minute.
 */
export function TimersList({ recipeId }: { recipeId?: string }) {
  const { timers, pause, resume, addMinute, end } = useTimers();
  const now = useNow(timers.length > 0);
  const shown = sortTimers(recipeId ? timers.filter((t) => t.recipeId === recipeId) : timers, now);
  if (!shown.length) return null;
  return (
    <View className="overflow-hidden rounded-card bg-card">
      {shown.map((t, i) => {
        const left = secondsLeft(t, now);
        const done = left === 0;
        return (
          <View key={t.id} className={i > 0 ? "border-t border-border/10" : undefined}>
            <SwipeRow
              leading={[{ label: "+1 min", icon: "plus", tone: "accent", onPress: () => addMinute(t.id) }]}
              trailing={[{ label: done ? "Clear" : "End", icon: "x", tone: "destructive", onPress: () => end(t.id) }]}
            >
              <TimerRow
                label={done ? `${t.label} · done` : t.label}
                recipe={recipeId ? (t.endsAt === null ? "Paused" : undefined) : [t.recipeTitle, t.endsAt === null ? "Paused" : null].filter(Boolean).join(" · ") || undefined}
                seconds={left}
                total={t.total}
                paused={t.endsAt === null}
                onPress={done ? () => end(t.id) : () => (t.endsAt === null ? resume(t.id) : pause(t.id))}
              />
            </SwipeRow>
          </View>
        );
      })}
      <Text variant="caption" className="px-4 pb-3 pt-1 font-normal">
        Tap to pause. Swipe left to end, right for another minute.
      </Text>
    </View>
  );
}

/** How many timers cook mode's panel stacks before the rest go behind "N more". */
export const STACK_MAX = 3;

/**
 * Cook mode's running timers, one bar each, soonest first. Same gestures as
 * the list: tap to pause or resume (or clear a finished one), swipe left to
 * end, swipe right to add a minute. Timers from another recipe (or all of
 * them, when no recipeId is given) show the recipe's name.
 */
export function TimerStack({ recipeId, onShowAll }: { recipeId?: string; onShowAll: () => void }) {
  const { timers, pause, resume, addMinute, end } = useTimers();
  const now = useNow(timers.length > 0);
  if (!timers.length) return null;
  // By time left, paused ones in place too, so pausing a timer doesn't move it out of view.
  const sorted = [...timers].sort((a, b) => secondsLeft(a, now) - secondsLeft(b, now));
  const shown = sorted.slice(0, STACK_MAX);
  const hidden = sorted.length - shown.length;
  return (
    <View className="gap-2">
      {shown.map((t) => {
        const left = secondsLeft(t, now);
        const done = left === 0;
        const recipe = t.recipeTitle && t.recipeId !== recipeId ? t.recipeTitle : undefined;
        return (
          <SwipeRow
            key={t.id}
            className="rounded-card"
            surfaceClassName="bg-transparent"
            leading={[{ label: "+1 min", icon: "plus", tone: "accent", onPress: () => addMinute(t.id) }]}
            trailing={[{ label: done ? "Clear" : "End", icon: "x", tone: "destructive", onPress: () => end(t.id) }]}
          >
            <TimerBar
              label={t.label}
              recipe={recipe}
              seconds={left}
              paused={t.endsAt === null}
              onOpenRecipe={recipe && t.recipeId ? () => router.push(`/recipe/${t.recipeId}`) : undefined}
              onPress={done ? () => end(t.id) : () => (t.endsAt === null ? resume(t.id) : pause(t.id))}
            />
          </SwipeRow>
        );
      })}
      {hidden > 0 ? (
        <View className="items-center">
          <Button label={`${hidden} more ${hidden === 1 ? "timer" : "timers"}`} variant="text" size="sm" onPress={onShowAll} />
        </View>
      ) : null}
    </View>
  );
}

/** Height the floating timers take up, so a screen can pad its bottom to scroll clear of them. */
export function useTimerRoom() {
  const count = useTimers().timers.length;
  return count ? Math.min(count, STACK_MAX) * 72 + (count > STACK_MAX ? 36 : 0) + 32 : 0;
}
