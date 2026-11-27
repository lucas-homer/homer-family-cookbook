import * as React from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { Text } from "./text";
import { TimerChip } from "./timer";

export type IngredientRowProps = {
  quantity?: string;
  name: string;
  note?: string;
  /** Just added by voice or import: butter highlight. */
  fresh?: boolean;
  /** Cook mode: tap to check off. */
  checked?: boolean;
  onToggle?: () => void;
};

export function IngredientRow({ quantity, name, note, fresh, checked, onToggle }: IngredientRowProps) {
  const checkable = onToggle !== undefined || checked !== undefined;
  return (
    <Pressable
      accessibilityRole={checkable ? "checkbox" : undefined}
      accessibilityState={checkable ? { checked: !!checked } : undefined}
      disabled={!onToggle}
      onPress={onToggle}
      className={cn("min-h-[50px] flex-row items-start gap-2.5 px-3 py-3.5", fresh && "bg-accent/20")}
    >
      {checkable ? (
        <View
          className={cn(
            "h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px]",
            checked ? "border-primary bg-primary" : "border-border/25",
          )}
        >
          {checked ? <Icon name="check" size={14} strokeWidth={3} color="primaryForeground" /> : null}
        </View>
      ) : null}
      <Text className={cn("w-[84px] font-semibold", checked && "text-muted-foreground line-through")}>{quantity ?? ""}</Text>
      <View className="flex-1">
        <Text className={cn(checked && "text-muted-foreground line-through")}>{name}</Text>
        {note ? <Text variant="footnote">{note}</Text> : null}
      </View>
    </Pressable>
  );
}

export type StepRowProps = {
  number: number;
  text: string;
  /** A timer found in the step, e.g. "12 min". */
  timer?: string;
  fresh?: boolean;
  onTimerPress?: () => void;
};

export function StepRow({ number, text, timer, fresh, onTimerPress }: StepRowProps) {
  return (
    <View className={cn("flex-row gap-3 p-3", fresh && "bg-accent/15")}>
      <View className="h-[26px] w-[26px] items-center justify-center rounded-full bg-primary">
        <Text className="text-footnote font-bold text-primary-foreground">{number}</Text>
      </View>
      <View className="flex-1 items-start gap-2">
        <Text variant="callout" className="leading-[22px]">
          {text}
        </Text>
        {timer ? <TimerChip label={timer} onPress={onTimerPress} /> : null}
      </View>
    </View>
  );
}

/** "+ Add ingredient" / "+ Add step" at the end of a list card. */
export function AddRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="min-h-[50px] flex-row items-center gap-2.5 px-3 active:opacity-70">
      <Icon name="plus" size={20} color="primary" />
      <Text className="font-semibold text-primary">{label}</Text>
    </Pressable>
  );
}

/** Cook mode progress: one segment per step. */
export function StepProgress({ total, current }: { total: number; current: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current }}
      accessibilityLabel={`Step ${current} of ${total}`}
      className="flex-row gap-[5px]"
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} className={cn("h-1 flex-1 rounded-sm", i < current ? "bg-primary" : "bg-border/10")} />
      ))}
    </View>
  );
}
