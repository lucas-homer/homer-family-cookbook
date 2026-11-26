import * as React from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  View,
  type AccessibilityActionEvent,
} from "react-native";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

/**
 * Gestures in one place. Built on PanResponder + Animated so the same code
 * runs in Storybook on the web; the app can swap in react-native-gesture-handler
 * later without changing these props.
 *
 * Every swipe action is also a VoiceOver custom action, so nothing is
 * swipe-only.
 */

export type SwipeAction = {
  label: string;
  icon?: IconName;
  /** destructive = tomato (End, Remove), accent = butter (+1 min), neutral = grey. */
  tone?: "destructive" | "accent" | "neutral" | "success";
  onPress?: () => void;
};

const ACTION_W = 84;
const toneBg = {
  destructive: "bg-destructive",
  accent: "bg-accent",
  neutral: "bg-muted-foreground",
  success: "bg-success",
};
const toneFg = {
  destructive: "primaryForeground",
  accent: "accentForeground",
  neutral: "primaryForeground",
  success: "primaryForeground",
} as const;
const toneText = {
  destructive: "text-primary-foreground",
  accent: "text-accent-foreground",
  neutral: "text-primary-foreground",
  success: "text-primary-foreground",
};

export type SwipeRowProps = {
  children: React.ReactNode;
  /** Revealed by swiping right (leading edge). */
  leading?: SwipeAction[];
  /** Revealed by swiping left (trailing edge). The first one fires on a full swipe. */
  trailing?: SwipeAction[];
  /** Swiping all the way across fires the first action, like Mail. */
  fullSwipe?: boolean;
  /** Start open, for showing the actions in a story or a design. */
  initiallyOpen?: "leading" | "trailing";
  /** Background of the sliding row. Defaults to the card color. */
  surfaceClassName?: string;
  className?: string;
};

function ActionButtons({
  actions,
  side,
  x,
  onDone,
}: {
  actions: SwipeAction[];
  side: "leading" | "trailing";
  x: Animated.Value;
  onDone: () => void;
}) {
  // Hidden while the row is closed, so no color peeks out at rounded corners.
  const opacity = x.interpolate(
    side === "leading"
      ? { inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }
      : { inputRange: [-1, 0], outputRange: [1, 0], extrapolate: "clamp" },
  );
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        flexDirection: "row",
        opacity,
        [side === "leading" ? "left" : "right"]: 0,
      }}
    >
      {actions.map((a) => {
        const tone = a.tone ?? "neutral";
        return (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            onPress={() => {
              a.onPress?.();
              onDone();
            }}
            className={cn(
              "items-center justify-center gap-1 active:opacity-80",
              toneBg[tone],
            )}
            style={{ width: ACTION_W }}
          >
            {a.icon ? (
              <Icon
                name={a.icon}
                size={20}
                strokeWidth={2.2}
                color={toneFg[tone]}
              />
            ) : null}
            <Text
              variant="footnote"
              className={cn("font-semibold", toneText[tone])}
            >
              {a.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

/** A list row with swipe actions: swipe left to End a timer or Remove, swipe right to Favorite or add a minute. */
export function SwipeRow({
  children,
  leading = [],
  trailing = [],
  fullSwipe = true,
  initiallyOpen,
  surfaceClassName = "bg-card",
  className,
}: SwipeRowProps) {
  const leadW = leading.length * ACTION_W;
  const trailW = trailing.length * ACTION_W;
  const start =
    initiallyOpen === "leading"
      ? leadW
      : initiallyOpen === "trailing"
        ? -trailW
        : 0;
  const [x] = React.useState(() => new Animated.Value(start));
  const [width, setWidth] = React.useState(0);
  // Where the row rests between drags. Read only inside gesture callbacks.
  const offsetRef = React.useRef(start);

  const settle = React.useCallback(
    (to: number, after?: () => void) => {
      offsetRef.current = to;
      Animated.spring(x, {
        toValue: to,
        useNativeDriver: false,
        bounciness: 0,
        speed: 18,
      }).start(() => after?.());
    },
    [x],
  );

  const fire = React.useCallback(
    (a: SwipeAction | undefined, dir: 1 | -1) => {
      if (!a) return;
      settle(dir * width, () => {
        a.onPress?.();
        x.setValue(0);
        offsetRef.current = 0;
      });
    },
    [settle, width, x],
  );

  const responder = React.useMemo(
    () =>
      // The ref is read only in the gesture callbacks, never during render.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => {
          let next = offsetRef.current + g.dx;
          if (!leading.length) next = Math.min(0, next);
          if (!trailing.length) next = Math.max(0, next);
          x.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          const next = offsetRef.current + g.dx;
          const full = width * 0.6;
          if (fullSwipe && next < -full && trailing.length)
            return fire(trailing[0], -1);
          if (fullSwipe && next > full && leading.length)
            return fire(leading[0], 1);
          if (next < -trailW / 2 || g.vx < -0.5)
            return settle(trailing.length ? -trailW : 0);
          if (next > leadW / 2 || g.vx > 0.5)
            return settle(leading.length ? leadW : 0);
          settle(0);
        },
        onPanResponderTerminate: () => settle(offsetRef.current),
      }),
    [leading, trailing, x, width, fullSwipe, fire, settle, trailW, leadW],
  );

  const actions = [...leading, ...trailing];
  const onAction = (e: AccessibilityActionEvent) =>
    actions.find((a) => a.label === e.nativeEvent.actionName)?.onPress?.();

  return (
    <View
      className={cn("overflow-hidden", className)}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {leading.length ? (
        <ActionButtons
          actions={leading}
          side="leading"
          x={x}
          onDone={() => settle(0)}
        />
      ) : null}
      {trailing.length ? (
        <ActionButtons
          actions={trailing}
          side="trailing"
          x={x}
          onDone={() => settle(0)}
        />
      ) : null}
      <Animated.View
        {...responder.panHandlers}
        accessibilityActions={actions.map((a) => ({
          name: a.label,
          label: a.label,
        }))}
        onAccessibilityAction={onAction}
        style={{ transform: [{ translateX: x }] }}
      >
        {/* className does not apply to Animated.View, so the surface is an inner View. */}
        <View className={surfaceClassName}>{children}</View>
      </Animated.View>
    </View>
  );
}

export type SwipePagerProps = {
  index: number;
  count: number;
  onChange: (index: number) => void;
  children: React.ReactNode;
  className?: string;
};

/** Cook mode: swipe left for the next step, right for the previous one. The page follows the finger. */
export function SwipePager({
  index,
  count,
  onChange,
  children,
  className,
}: SwipePagerProps) {
  const [x] = React.useState(() => new Animated.Value(0));
  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => {
          const edge =
            (g.dx > 0 && index === 0) || (g.dx < 0 && index === count - 1);
          x.setValue(edge ? g.dx * 0.25 : g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const go =
            Math.abs(g.dx) > 70 || Math.abs(g.vx) > 0.5
              ? g.dx < 0
                ? 1
                : -1
              : 0;
          const next = Math.min(count - 1, Math.max(0, index + go));
          if (next !== index) onChange(next);
          Animated.spring(x, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 0,
            speed: 16,
          }).start();
        },
      }),
    [index, count, onChange, x],
  );
  return (
    <Animated.View
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 1,
        max: count,
        now: index + 1,
        text: `Step ${index + 1} of ${count}`,
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment" && index < count - 1)
          onChange(index + 1);
        if (e.nativeEvent.actionName === "decrement" && index > 0)
          onChange(index - 1);
      }}
      style={{ flex: 1, transform: [{ translateX: x }] }}
    >
      <View className={className}>{children}</View>
    </Animated.View>
  );
}

/** A one-time hint the first time a gesture is available, e.g. "Swipe left on a timer to end it". */
export function GestureHint({
  icon = "back",
  label,
  className,
}: {
  icon?: IconName;
  label: string;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-2 self-center rounded-full bg-foreground/80 px-3.5 py-2",
        className,
      )}
    >
      <Icon name={icon} size={14} strokeWidth={2.4} color="background" />
      <Text variant="footnote" className="font-semibold text-background">
        {label}
      </Text>
    </View>
  );
}
