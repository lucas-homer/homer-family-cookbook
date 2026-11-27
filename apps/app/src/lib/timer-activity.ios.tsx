import { HStack, Image, ProgressView, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, frame, monospacedDigit, padding, tint } from "@expo/ui/swift-ui/modifiers";
import { Platform } from "react-native";
import type { LiveActivity, LiveActivityEnvironment, LiveActivityFactory, LiveActivityLayout } from "expo-widgets";

import type { TimerActivityProps } from "./timer-activity";

// The Live Activity for a running timer: a countdown on the lock screen and in
// the Dynamic Island, one per timer. iOS draws the countdown itself, so it
// keeps ticking while the app is closed. Its stale date is the end time, so it
// switches to "Done" on its own too, even if the app isn't running.

// The 'widget' directive turns this function into source code that runs in the
// widget extension, so it can only use @expo/ui's SwiftUI views and modifiers,
// not anything else from this file.
function TimerActivity(props: TimerActivityProps, env: LiveActivityEnvironment): LiveActivityLayout {
  "widget";
  const red = env.colorScheme === "dark" ? "#FF6A4D" : "#D23B22";
  const done = !props.paused && (env.isStale || props.to <= Date.now());
  const range = { lower: new Date(props.from), upper: new Date(props.to) };
  const clock = (size: number) =>
    done ? (
      <Text modifiers={[font({ size, weight: "semibold" }), foregroundStyle(red)]}>Done</Text>
    ) : props.paused ? (
      <Text modifiers={[font({ size, weight: "semibold" }), monospacedDigit(), foregroundStyle({ type: "hierarchical", style: "secondary" })]}>
        {props.paused}
      </Text>
    ) : (
      <Text timerInterval={range} countsDown modifiers={[font({ size, weight: "semibold" }), monospacedDigit(), foregroundStyle(red)]} />
    );
  const caption = props.paused ? `${props.recipe ? `${props.recipe} · ` : ""}Paused` : props.recipe;
  return {
    banner: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 })]}>
        <HStack spacing={12}>
          <Image systemName={done ? "bell.fill" : "timer"} modifiers={[font({ size: 22 }), foregroundStyle(red)]} />
          <VStack alignment="leading" spacing={2}>
            {caption ? (
              <Text modifiers={[font({ size: 13 }), foregroundStyle({ type: "hierarchical", style: "secondary" })]}>{caption}</Text>
            ) : null}
            <Text modifiers={[font({ size: 18, weight: "semibold", design: "serif" })]}>{props.label}</Text>
          </VStack>
          <Spacer />
          {clock(34)}
        </HStack>
        {done || props.paused ? null : <ProgressView timerInterval={range} countsDown modifiers={[tint(red)]} />}
      </VStack>
    ),
    compactLeading: <Image systemName={done ? "bell.fill" : "timer"} modifiers={[foregroundStyle(red)]} />,
    compactTrailing: done ? (
      <Text modifiers={[foregroundStyle(red)]}>Done</Text>
    ) : props.paused ? (
      <Text modifiers={[monospacedDigit()]}>{props.paused}</Text>
    ) : (
      <Text timerInterval={range} countsDown modifiers={[monospacedDigit(), foregroundStyle(red), frame({ maxWidth: 56 })]} />
    ),
    minimal: <Image systemName={done ? "bell.fill" : "timer"} modifiers={[foregroundStyle(red)]} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 4 })]}>
        {caption ? (
          <Text modifiers={[font({ size: 13 }), foregroundStyle({ type: "hierarchical", style: "secondary" })]}>{caption}</Text>
        ) : null}
        <Text modifiers={[font({ size: 17, weight: "semibold", design: "serif" })]}>{props.label}</Text>
      </VStack>
    ),
    expandedTrailing: clock(30),
    expandedBottom: done || props.paused ? undefined : <ProgressView timerInterval={range} countsDown modifiers={[tint(red)]} />,
  };
}

let factory: LiveActivityFactory<TimerActivityProps> | null | undefined;

/** The Live Activity type for timers, or null where there are none (web, Android, Expo Go, old iOS). */
export function timerActivities() {
  if (factory !== undefined) return factory;
  factory = null;
  if (Platform.OS !== "ios" || Number.parseFloat(String(Platform.Version)) < 16.2) return factory;
  try {
    // Loaded here, not at the top, because the native module is missing in Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createLiveActivity } = require("expo-widgets") as typeof import("expo-widgets");
    factory = createLiveActivity<TimerActivityProps>("Timer", TimerActivity);
  } catch {
    factory = null;
  }
  return factory;
}

export type { LiveActivity, TimerActivityProps };
