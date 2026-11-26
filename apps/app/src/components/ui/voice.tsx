import * as React from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, View } from "react-native";
import { cn } from "@/lib/utils";
import { shadow } from "@/theme";
import { useTheme } from "@/theme/use-theme";
import { CheckTick } from "./chip";
import { Glass } from "./glass";
import { Icon } from "./icon";
import { Text } from "./text";

const BARS = [8, 16, 26, 14, 30, 22, 10, 24, 34, 18, 10, 28, 16, 6, 20, 30, 12, 24, 8, 18, 26, 10];

function useReduceMotion() {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

export type WaveformProps = {
  bars?: number;
  /** Bar height multiplier. Pass the mic level (0..1) when you have it. */
  scale?: number;
  active?: boolean;
  height?: number;
};

/** Tomato bars that move while the mic hears speech. Still when Reduce Motion is on. */
export function Waveform({ bars = 16, scale = 0.7, active = true, height = 34 }: WaveformProps) {
  const reduce = useReduceMotion();
  const { colors } = useTheme();
  const [t] = React.useState(() => new Animated.Value(0));
  React.useEffect(() => {
    if (!active || reduce) return;
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduce, t]);
  return (
    <View accessibilityElementsHidden className="flex-row items-center gap-[3px]" style={{ height }}>
      {BARS.slice(0, bars).map((h, i) => {
        const phase = (i % 5) / 5;
        const s = t.interpolate({
          inputRange: [0, phase, Math.min(1, phase + 0.5), 1],
          outputRange: [0.55, 1, 0.45, 0.55],
          extrapolate: "clamp",
        });
        return (
          <Animated.View
            key={i}
            style={{
              width: 3,
              borderRadius: 2,
              backgroundColor: colors.primary,
              height: Math.max(4, h * scale),
              opacity: active ? 0.45 + h / 70 : 0.25,
              transform: [{ scaleY: active && !reduce ? s : 1 }],
            }}
          />
        );
      })}
    </View>
  );
}

/** "● Listening" under the screen title. */
export function ListeningBadge() {
  return (
    <View accessibilityLiveRegion="polite" className="flex-row items-center gap-[5px]">
      <View className="h-[7px] w-[7px] rounded-full bg-primary" />
      <Text className="text-caption font-bold text-primary">Listening</Text>
    </View>
  );
}

export type VoiceBarProps = {
  /** What was last heard, or a hint before anything is said. */
  transcript: string;
  /** Fields still to say on this tab. Ticks turn green as each is heard. */
  checklist?: { label: string; done: boolean }[];
  /** Replaces the checklist, e.g. a count of ingredients heard. */
  summary?: React.ReactNode;
  listening?: boolean;
  onMicPress?: () => void;
  onKeyboardPress?: () => void;
  className?: string;
};

/**
 * Bottom bar for "Talk it through". Stays put across Basics, Ingredients
 * and Steps, so you can keep talking while you switch tabs.
 */
export function VoiceBar({ transcript, checklist, summary, listening = true, onMicPress, onKeyboardPress, className }: VoiceBarProps) {
  return (
    <Glass variant="strong" className={cn("rounded-[34px] py-3 pl-[18px] pr-3", className)}>
      {summary ? <View className="mb-2.5">{summary}</View> : null}
      {!summary && checklist?.length ? (
        <View className="mb-2.5 flex-row flex-wrap gap-[5px]">
          {checklist.map((c) => (
            <CheckTick key={c.label} label={c.label} done={c.done} />
          ))}
        </View>
      ) : null}
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Waveform active={listening} scale={0.5} height={22} />
          <Text accessibilityLiveRegion="polite" className="text-[14px] leading-[19px]" numberOfLines={2}>
            {transcript}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Type instead" onPress={onKeyboardPress} className="active:opacity-80">
          <Glass interactive className="h-11 w-11 items-center justify-center rounded-full">
            <Icon name="keyboard" size={20} />
          </Glass>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? "Stop listening" : "Start listening"}
          onPress={onMicPress}
          className="h-14 w-14 items-center justify-center rounded-full bg-primary active:opacity-80"
          style={{ boxShadow: shadow.primary }}
        >
          <Icon name={listening ? "pause" : "mic"} size={24} strokeWidth={2.2} color="primaryForeground" />
        </Pressable>
      </View>
    </Glass>
  );
}

/** Shown on every form tab when not listening. Tap to start talking. */
export function TalkPill({ onPress, label = "Talk it through" }: { onPress?: () => void; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="self-center active:opacity-80">
      <Glass variant="strong" interactive className="h-[54px] flex-row items-center gap-2.5 rounded-full pl-2 pr-[22px]">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
          <Icon name="mic" size={20} strokeWidth={2.2} color="primaryForeground" />
        </View>
        <Text className="text-callout font-semibold">{label}</Text>
      </Glass>
    </Pressable>
  );
}
