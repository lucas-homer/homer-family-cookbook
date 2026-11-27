import * as React from "react";
import { View } from "react-native";
import { SwipeRow, Text, TimerRow } from "@/components/ui";
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
