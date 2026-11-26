import * as React from "react";
import { Pressable, View, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";
import { Glass } from "./glass";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

export type ChipProps = Omit<PressableProps, "children"> & {
  label: string;
  selected?: boolean;
  icon?: IconName;
  /** glass over the paper background, solid on white cards and sheets. */
  surface?: "glass" | "solid";
  /** How many recipes have this tag (or match with it). */
  count?: number;
  /** Shows an ✕ and makes the whole chip remove the tag. */
  removable?: boolean;
  className?: string;
};

/** Tag and filter chip. Selected is solid tomato. */
export function Chip({ label, selected, icon, surface = "glass", count, removable, className, ...props }: ChipProps) {
  const fg = selected ? "primaryForeground" : "foreground";
  const body = (
    <>
      {icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <Text variant="subhead" className={cn("font-semibold", selected && "text-primary-foreground")}>
        {label}
      </Text>
      {count != null ? (
        <Text variant="footnote" className={cn("font-medium", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {count}
        </Text>
      ) : null}
      {removable ? <Icon name="x" size={13} strokeWidth={2.6} color={fg} /> : null}
    </>
  );
  const base = "h-9 flex-row items-center gap-1.5 rounded-full px-3.5";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`${removable ? "Remove " : ""}${label}${count != null ? `, ${count} recipes` : ""}`}
      className="active:opacity-80"
      {...props}
    >
      {selected ? (
        <View className={cn(base, "bg-primary", className)}>{body}</View>
      ) : surface === "glass" ? (
        <Glass className={cn(base, className)}>
          <View className="flex-row items-center gap-1.5">{body}</View>
        </Glass>
      ) : (
        <View className={cn(base, "border border-border/10 bg-card", className)}>{body}</View>
      )}
    </Pressable>
  );
}

export type CheckTickProps = { label: string; done?: boolean };

/** The small chips in the voice bar that tick off as each field is heard. */
export function CheckTick({ label, done }: CheckTickProps) {
  return (
    <View
      accessibilityLabel={`${label}${done ? ", heard" : ", not yet"}`}
      className={cn("flex-row items-center gap-1 rounded-full px-2 py-1", done ? "bg-success/15" : "bg-border/5")}
    >
      {done ? <Icon name="check" size={12} strokeWidth={3} color="successForeground" /> : null}
      <Text className={cn("text-caption font-semibold", done ? "text-success-foreground" : "text-muted-foreground")}>{label}</Text>
    </View>
  );
}
