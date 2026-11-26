import * as React from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/use-theme";
import { Icon } from "./icon";
import { Text } from "./text";

export type TextFieldProps = TextInputProps & {
  label: string;
  /**
   * heard: just filled by voice (soft butter, fades back to default).
   * check: imported from a photo or link and worth a second look.
   */
  tone?: "default" | "heard" | "check";
  /** Shown under the field. With tone "check", explains what to check. */
  hint?: string;
  error?: string;
  /** Force the focused look (for stories and voice: the field being filled). */
  active?: boolean;
  className?: string;
};

export function TextField({ label, tone = "default", hint, error, active, multiline, className, onFocus, onBlur, editable = true, ...props }: TextFieldProps) {
  const [focused, setFocused] = React.useState(false);
  const { colors } = useTheme();
  const on = active ?? focused;
  return (
    <View className={cn("min-w-0 gap-1.5", !editable && "opacity-40", className)}>
      <Text variant="label" className={cn(error && "text-destructive")}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        multiline={multiline}
        editable={editable}
        textAlignVertical={multiline ? "top" : "center"}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        className={cn(
          "rounded-field border bg-card px-4 font-sans text-body text-foreground",
          multiline ? "min-h-[76px] py-3" : "h-[52px]",
          tone === "default" && "border-border/10",
          tone === "heard" && "border-accent/60 bg-accent-soft",
          tone === "check" && "border-accent bg-accent-soft",
          on && "border-primary",
          error && "border-destructive",
        )}
        style={[
          on ? { boxShadow: "0 0 0 4px rgba(210,59,34,0.12)" } : null,
          // web: no browser focus outline, the ring above replaces it
          { outlineStyle: "none" } as object,
        ]}
        {...props}
      />
      {error ? (
        <Text variant="footnote" className="text-destructive">
          {error}
        </Text>
      ) : hint ? (
        <View className="flex-row items-center gap-1">
          {tone === "check" ? <Icon name="sparkle" size={13} color="mutedForeground" /> : null}
          <Text variant="footnote">{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}
