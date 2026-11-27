import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { ActivityIndicator, Pressable, View, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";
import { shadow } from "@/theme";
import { useTheme } from "@/theme/use-theme";
import { Glass } from "./glass";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

const buttonVariants = cva("flex-row items-center justify-center gap-2 rounded-full", {
  variants: {
    variant: {
      primary: "bg-primary",
      secondary: "",
      destructive: "bg-destructive",
      text: "bg-transparent",
      butter: "bg-accent",
    },
    size: {
      lg: "h-14 px-6",
      md: "h-[50px] px-5",
      sm: "h-10 px-4",
      xl: "h-16 px-8",
    },
    block: { true: "w-full", false: "self-start" },
  },
  defaultVariants: { variant: "primary", size: "lg", block: false },
});

const labelVariants = cva("font-semibold", {
  variants: {
    variant: {
      primary: "text-primary-foreground",
      secondary: "text-foreground",
      destructive: "text-primary-foreground",
      text: "text-primary",
      butter: "text-accent-foreground",
    },
    size: { lg: "text-body", md: "text-callout", sm: "text-subhead", xl: "text-[19px]" },
  },
  defaultVariants: { variant: "primary", size: "lg" },
});

type Variant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

export type ButtonProps = Omit<PressableProps, "children"> &
  VariantProps<typeof buttonVariants> & {
    label: string;
    icon?: IconName;
    loading?: boolean;
    className?: string;
  };

const iconColor: Record<Variant, string> = {
  primary: "primaryForeground",
  secondary: "foreground",
  destructive: "primaryForeground",
  text: "primary",
  butter: "accentForeground",
};

export function Button({ label, icon, variant = "primary", size = "lg", block, loading, disabled, className, style, ...props }: ButtonProps) {
  const v = variant ?? "primary";
  const { colors } = useTheme();
  const dim = disabled || loading;
  const inner = (
    <>
      {loading ? (
        <ActivityIndicator color={(colors as Record<string, string>)[iconColor[v]]} />
      ) : icon ? (
        <Icon name={icon} size={size === "sm" ? 16 : 18} color={iconColor[v]} />
      ) : null}
      <Text className={labelVariants({ variant: v, size })}>{label}</Text>
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      // iOS draws nothing for Liquid Glass under a parent with opacity below 1,
      // so a glass button dims its content instead of the whole button.
      className={cn(block ? "w-full" : "self-start", v !== "secondary" && dim && "opacity-50", v !== "secondary" && "active:opacity-80")}
      style={style}
      {...props}
    >
      {v === "secondary" ? (
        <Glass interactive className={cn(buttonVariants({ variant: v, size, block }), className)}>
          <View className={cn("flex-row items-center justify-center gap-2", dim && "opacity-50")}>{inner}</View>
        </Glass>
      ) : (
        <View
          className={cn(buttonVariants({ variant: v, size, block }), className)}
          style={v === "primary" ? { boxShadow: shadow.primary } : undefined}
        >
          {inner}
        </View>
      )}
    </Pressable>
  );
}

export type IconButtonProps = Omit<PressableProps, "children"> & {
  icon: IconName;
  /** Read by VoiceOver. Required: an icon has no visible label. */
  label: string;
  size?: number;
  variant?: "glass" | "primary" | "plain";
  className?: string;
};

/** Round glass button for toolbars (back, more, share). 44pt minimum. */
export function IconButton({ icon, label, size = 44, variant = "glass", className, ...props }: IconButtonProps) {
  const dims = { width: size, height: size };
  const glyph = Math.round(size * 0.45);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} className={variant === "glass" ? undefined : "active:opacity-80"} {...props}>
      {variant === "glass" ? (
        <Glass interactive className={cn("items-center justify-center rounded-full", className)} style={dims}>
          <Icon name={icon} size={glyph} />
        </Glass>
      ) : (
        <View
          className={cn("items-center justify-center rounded-full", variant === "primary" && "bg-primary", className)}
          style={[dims, variant === "primary" ? { boxShadow: shadow.primary } : null]}
        >
          <Icon name={icon} size={glyph} color={variant === "primary" ? "primaryForeground" : "foreground"} />
        </View>
      )}
    </Pressable>
  );
}
