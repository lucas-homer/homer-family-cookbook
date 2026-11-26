import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { cssInterop } from "nativewind";
import * as React from "react";
import { Platform, View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";
import { glass } from "@/theme";
import { useTheme } from "@/theme/use-theme";

cssInterop(GlassView, { className: "style" });
cssInterop(BlurView, { className: "style" });

export type GlassProps = ViewProps & {
  className?: string;
  /**
   * regular: toolbars, tab bar, round buttons.
   * strong: panels that hold text (voice bar, popovers), more opaque.
   * clear: over photos.
   */
  variant?: "regular" | "strong" | "clear";
  /** iOS 26: the glass reacts to touch. Use on buttons. */
  interactive?: boolean;
  tint?: string;
};

const liquid = Platform.OS === "ios" && isLiquidGlassAvailable();

/**
 * Apple Liquid Glass on iOS 26, a blur material on older iOS and Android,
 * and backdrop-filter on web. Children sit on top. Give it a rounded className.
 */
export function Glass({ className, variant = "regular", interactive, tint, style, children, ...props }: GlassProps) {
  const { scheme, colors } = useTheme();

  if (liquid) {
    return (
      <GlassView
        glassEffectStyle={variant === "clear" ? "clear" : "regular"}
        isInteractive={interactive}
        tintColor={tint ?? (variant === "strong" ? colors.glassFillStrong : undefined)}
        colorScheme={scheme}
        className={cn("overflow-hidden", className)}
        style={style}
        {...props}
      >
        {children}
      </GlassView>
    );
  }

  const fill = variant === "strong" ? colors.glassFillStrong : variant === "clear" ? "transparent" : colors.glassFill;
  const edge = { borderWidth: 1, borderColor: colors.glassEdge, boxShadow: glass.shadow[scheme] };

  if (Platform.OS === "web") {
    return (
      <View
        className={cn("overflow-hidden", className)}
        style={[
          edge,
          { backgroundColor: tint ?? fill },
          // react-native-web passes these through to CSS.
          {
            backdropFilter: `blur(${glass.blur}px) saturate(${glass.saturate * 100}%)`,
            WebkitBackdropFilter: `blur(${glass.blur}px) saturate(${glass.saturate * 100}%)`,
          } as object,
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <View className={cn("overflow-hidden", className)} style={[edge, style]} {...props}>
      <BlurView
        intensity={80}
        tint={scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: tint ?? fill }}
      />
      {children}
    </View>
  );
}
