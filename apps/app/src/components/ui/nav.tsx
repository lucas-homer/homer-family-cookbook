import * as React from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils";
import { Glass } from "./glass";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

export type TabItem<T extends string> = { key: T; label: string; icon: IconName };

export type TabBarProps<T extends string> = {
  items: TabItem<T>[];
  active: T;
  onChange?: (key: T) => void;
  onSearch?: () => void;
  searchActive?: boolean;
  className?: string;
};

/**
 * Floating glass tab bar with a separate search button, as in iOS 26.
 * On iOS the real app uses the native tab bar (NativeTabs); this draws the
 * same thing for web and for stories.
 */
export function TabBar<T extends string>({ items, active, onChange, onSearch, searchActive, className }: TabBarProps<T>) {
  return (
    <View className={cn("flex-row gap-2.5", className)}>
      <Glass className="flex-1 flex-row rounded-full p-[5px]" accessibilityRole="tablist">
        {items.map((it) => {
          const on = it.key === active;
          return (
            <Pressable
              key={it.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={it.label}
              onPress={() => onChange?.(it.key)}
              className={cn("flex-1 items-center gap-0.5 rounded-full py-[7px]", on && "bg-primary/10")}
            >
              <Icon name={it.icon} size={22} color={on ? "primary" : "foreground"} />
              <Text className={cn("text-[10px] font-semibold", on ? "text-primary" : "text-foreground")}>{it.label}</Text>
            </Pressable>
          );
        })}
      </Glass>
      <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={onSearch}>
        {searchActive ? (
          <View className="h-[62px] w-[62px] items-center justify-center rounded-full bg-primary">
            <Icon name="search" size={24} color="primaryForeground" />
          </View>
        ) : (
          <Glass interactive className="h-[62px] w-[62px] items-center justify-center rounded-full">
            <Icon name="search" size={24} />
          </Glass>
        )}
      </Pressable>
    </View>
  );
}

export type ToolbarProps = { left?: React.ReactNode; title?: React.ReactNode; right?: React.ReactNode; className?: string };

/** Top row of floating glass buttons with an optional centered title. */
export function Toolbar({ left, title, right, className }: ToolbarProps) {
  return (
    <View className={cn("min-h-[44px] flex-row items-center justify-between gap-2.5", className)}>
      <View className="min-w-[44px] flex-row gap-2.5">{left}</View>
      {typeof title === "string" ? <Text variant="headline">{title}</Text> : title}
      <View className="min-w-[44px] flex-row justify-end gap-2.5">{right}</View>
    </View>
  );
}
