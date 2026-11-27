import * as React from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-screens/experimental";
import { Button, Text } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useTheme } from "@/theme/use-theme";

/**
 * The root of each tab screen. On iPad the tab bar can become a sidebar that
 * floats over the left of the screen; iOS reports it as a safe area inset on
 * the tab, so padding the left and right edges keeps content out from under
 * it. (The app-wide safe area hook can't see it: it measures the whole window.)
 */
export function TabScreen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={{ left: true, right: true }} style={{ backgroundColor: colors.background }}>
      {children}
    </SafeAreaView>
  );
}

/** Top padding for a screen with no native header. On web the tab bar sits at the top, so leave room for it. */
export function useTopInset(extra = 12) {
  return useSafeAreaInsets().top + extra + (Platform.OS === "web" ? 56 : 0);
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

/** Error with a retry. Offline gets its own words. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = error instanceof ApiError && error.status === 0;
  return (
    <View className="items-center gap-3 px-6 py-16">
      <Text variant="headline">{offline ? "You're offline" : "Couldn't load this"}</Text>
      <Text variant="callout" className="text-center text-muted-foreground">
        {offline ? "Check your connection and try again." : "Something went wrong on our side. Try again in a moment."}
      </Text>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function Empty({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <View className="items-center gap-2 px-6 py-16">
      <Text variant="title3">{title}</Text>
      <Text variant="callout" className="text-center text-muted-foreground">
        {message}
      </Text>
      {action ? <View className="mt-3">{action}</View> : null}
    </View>
  );
}
