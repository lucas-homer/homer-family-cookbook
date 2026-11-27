import * as React from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/use-theme";
import { Glass } from "./glass";
import { Icon } from "./icon";
import { Text } from "./text";

const tabular = { fontVariant: ["tabular-nums" as const] };

/** Format seconds as 4:05 or 1:04:05. */
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${String(m).padStart(2, "0")}:${sec}`;
}

/** Butter chip inside a step: tap to start the timer it names. */
export function TimerChip({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Start ${label} timer`}
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-full bg-accent px-2.5 py-[5px] active:opacity-80"
    >
      <Icon name="timer" size={14} color="accentForeground" />
      <Text className="text-footnote font-semibold text-accent-foreground">{label}</Text>
    </Pressable>
  );
}

export type TimerBarProps = { label: string; seconds: number; onPress?: () => void; className?: string };

/** Running timer pinned in cook mode's control panel. */
export function TimerBar({ label, seconds, onPress, className }: TimerBarProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatClock(seconds)} left`}
      onPress={onPress}
      className={cn("flex-row items-center gap-3 rounded-card bg-accent px-3.5 py-3", className)}
    >
      <Icon name="timer" size={22} color="accentForeground" />
      <Text className="flex-1 text-callout font-semibold text-accent-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text className="text-title-2 font-bold text-accent-foreground" style={tabular}>
        {formatClock(seconds)}
      </Text>
    </Pressable>
  );
}

export type TimerRingProps = { progress: number; size?: number; stroke?: number };

/** Remaining time as a ring. progress 0..1 is the share already elapsed. */
export function TimerRing({ progress, size = 44, stroke = 5 }: TimerRingProps) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <Svg width={size} height={size} accessibilityElementsHidden>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.separator} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.primary}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c * p}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export type TimerRowProps = {
  label: string;
  recipe?: string;
  seconds: number;
  total: number;
  paused?: boolean;
  onPress?: () => void;
};

/** A row in the Timers list (Cooking tab, iPad rail). */
export function TimerRow({ label, recipe, seconds, total, paused, onPress }: TimerRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatClock(seconds)} left${paused ? ", paused" : ""}`}
      onPress={onPress}
      className="flex-row items-center gap-3.5 px-4 py-3.5 active:bg-border/5"
    >
      <TimerRing progress={1 - seconds / total} />
      <View className="flex-1">
        <Text variant="headline">{label}</Text>
        {recipe ? <Text variant="footnote">{recipe}</Text> : null}
      </View>
      <Text className={cn("text-[24px] font-bold", paused && "text-muted-foreground")} style={tabular}>
        {formatClock(seconds)}
      </Text>
    </Pressable>
  );
}

export type QuickTimerButtonProps = { listening?: boolean; onPress?: () => void; className?: string };

/** Floating button in cook mode: tap and say "twelve minutes for the biscuits". */
export function QuickTimerButton({ listening, onPress, className }: QuickTimerButtonProps) {
  const badge = (
    <View className={cn("absolute -bottom-1.5 -right-2 h-5 w-5 items-center justify-center rounded-full", listening ? "bg-card" : "bg-accent")}>
      <Icon name="mic" size={12} strokeWidth={2.4} color="accentForeground" />
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listening ? "Listening for a timer" : "Quick timer"}
      accessibilityHint="Say how long, for example twelve minutes for the biscuits"
      onPress={onPress}
      className={cn(listening && "active:opacity-80", className)}
    >
      {listening ? (
        <View
          className="h-[62px] w-[62px] items-center justify-center rounded-full bg-primary"
          style={{ boxShadow: "0 0 0 8px rgba(210,59,34,0.18), 0 10px 30px rgba(210,59,34,0.35)" }}
        >
          <View>
            <Icon name="timer" size={26} color="primaryForeground" />
            {badge}
          </View>
        </View>
      ) : (
        <Glass interactive className="h-[62px] w-[62px] items-center justify-center rounded-full">
          <View>
            <Icon name="timer" size={26} />
            {badge}
          </View>
        </Glass>
      )}
    </Pressable>
  );
}
