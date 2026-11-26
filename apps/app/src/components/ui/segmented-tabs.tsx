import * as React from "react";
import { Pressable } from "react-native";
import { cn } from "@/lib/utils";
import { Glass } from "./glass";
import { Text } from "./text";

export type SegmentedTabsProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** Glass segmented control, e.g. Basics / Ingredients / Steps. */
export function SegmentedTabs<T extends string>({ options, value, onChange, className }: SegmentedTabsProps<T>) {
  return (
    <Glass className={cn("flex-row rounded-full p-1", className)} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o)}
            className={cn("h-9 flex-1 items-center justify-center rounded-full", on && "bg-card")}
            style={on ? { boxShadow: "0 1px 3px rgba(29,26,23,0.10)" } : undefined}
          >
            <Text className={cn("text-[14px] font-semibold", on ? "text-primary" : "text-foreground")}>{o}</Text>
          </Pressable>
        );
      })}
    </Glass>
  );
}
