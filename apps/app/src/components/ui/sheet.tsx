import * as React from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils";
import { shadow } from "@/theme";
import { Glass } from "./glass";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

export type SheetHeaderProps = {
  title?: string;
  /** Left action, usually Cancel. */
  cancel?: { label: string; onPress?: () => void };
  /** Right action, usually Done or Save (bold tomato). */
  confirm?: { label: string; onPress?: () => void; disabled?: boolean };
};

export function TextAction({ label, onPress, bold, tone = "primary", disabled }: { label: string; onPress?: () => void; bold?: boolean; tone?: "primary" | "foreground"; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} hitSlop={10} className={cn("min-w-[60px] active:opacity-60", disabled && "opacity-40")}>
      <Text className={cn(bold && "font-semibold", tone === "primary" ? "text-primary" : "text-foreground")}>{label}</Text>
    </Pressable>
  );
}

/**
 * The content of a bottom sheet: grabber, header row and body on the grouped
 * background. Present it with the platform's form sheet (Expo Router
 * presentation "formSheet"); this component only draws it.
 */
export function SheetSurface({ title, cancel, confirm, children, className }: SheetHeaderProps & { children?: React.ReactNode; className?: string }) {
  return (
    <View className={cn("overflow-hidden rounded-t-sheet bg-grouped", className)} style={{ boxShadow: shadow.sheet }}>
      <View className="mx-auto mt-2 h-[5px] w-[38px] rounded-full bg-border/20" />
      <View className="min-h-[44px] flex-row items-center justify-between px-4 pt-2">
        {cancel ? <TextAction label={cancel.label} onPress={cancel.onPress} tone="foreground" /> : <View className="w-[60px]" />}
        {title ? <Text variant="headline">{title}</Text> : null}
        {confirm ? (
          <View className="min-w-[60px] items-end">
            <TextAction label={confirm.label} onPress={confirm.onPress} bold disabled={confirm.disabled} />
          </View>
        ) : (
          <View className="w-[60px]" />
        )}
      </View>
      <View className="px-4 pb-6 pt-2">{children}</View>
    </View>
  );
}

export type ChoiceProps = { icon: IconName; title: string; detail?: string; onPress?: () => void };

/** Big option row in a choose sheet ("Take a photo", "Paste a link"). */
export function Choice({ icon, title, detail, onPress }: ChoiceProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center gap-3.5 rounded-card bg-card p-4 active:opacity-80">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
        <Icon name={icon} size={22} color="primary" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text variant="headline">{title}</Text>
        {detail ? <Text variant="footnote">{detail}</Text> : null}
      </View>
      <Icon name="chevron" size={16} strokeWidth={2.4} color="chevron" />
    </Pressable>
  );
}

/** Glass popover card, e.g. the quick-timer "Listening…" bubble. */
export function Popover({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Glass variant="strong" className={cn("rounded-panel p-[18px]", className)}>
      {children}
    </Glass>
  );
}

export type ToastProps = { icon?: IconName; message: string; action?: { label: string; onPress?: () => void } };

/** Brief confirmation above the bottom controls ("Biscuits timer started"). */
export function Toast({ icon = "check", message, action }: ToastProps) {
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" className="self-center">
      <Glass variant="strong" className="flex-row items-center gap-2.5 rounded-full py-2.5 pl-3 pr-4">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-success">
          <Icon name={icon} size={15} strokeWidth={3} color="#ffffff" />
        </View>
        <Text className="text-subhead font-semibold">{message}</Text>
        {action ? <TextAction label={action.label} onPress={action.onPress} bold /> : null}
      </Glass>
    </View>
  );
}
