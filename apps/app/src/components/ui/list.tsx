import * as React from "react";
import { Pressable, Switch, View } from "react-native";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/use-theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

export type GroupProps = { title?: string; footer?: string; children: React.ReactNode; className?: string };

/** iOS inset grouped list section: white card on the grouped background. */
export function Group({ title, footer, children, className }: GroupProps) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View className={className}>
      {title ? (
        <Text variant="section" className="mx-4 mb-1.5 mt-4">
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-card bg-card">
        {rows.map((row, i) => (
          <View key={i}>
            {row}
            {i < rows.length - 1 ? <View className="ml-4 h-px bg-border/10" /> : null}
          </View>
        ))}
      </View>
      {footer ? (
        <Text variant="footnote" className="mx-4 mt-1.5">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export type ListRowProps = {
  label: string;
  detail?: string;
  icon?: IconName;
  /** Background of the rounded square behind the icon (Settings style). */
  iconTone?: "primary" | "accent" | "success" | "muted";
  destructive?: boolean;
  chevron?: boolean;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  onPress?: () => void;
};

const toneBg = { primary: "bg-primary", accent: "bg-accent", success: "bg-success", muted: "bg-muted-foreground" };

export function ListRow({ label, detail, icon, iconTone = "primary", destructive, chevron = true, toggle, onPress }: ListRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={toggle ? "switch" : "button"}
      disabled={!onPress && !toggle}
      onPress={toggle ? () => toggle.onChange(!toggle.value) : onPress}
      className="min-h-[50px] flex-row items-center gap-3 px-4 active:bg-border/5"
    >
      {icon ? (
        <View className={cn("h-[30px] w-[30px] items-center justify-center rounded-lg", toneBg[iconTone])}>
          <Icon name={icon} size={17} color={iconTone === "accent" ? "accentForeground" : "#ffffff"} />
        </View>
      ) : null}
      <Text className={cn("flex-1", destructive && "text-primary")}>{label}</Text>
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: colors.success, false: colors.muted }}
          thumbColor="#ffffff"
        />
      ) : destructive ? null : (
        <>
          {detail ? <Text className="text-muted-foreground">{detail}</Text> : null}
          {chevron ? <Icon name="chevron" size={16} strokeWidth={2.4} color="chevron" /> : null}
        </>
      )}
    </Pressable>
  );
}
